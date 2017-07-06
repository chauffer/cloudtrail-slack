const AWS = require('aws-sdk');
const moment = require('moment');
const slack = require('./slack');
const async = require('async');
const colors = require('colors');
const LRU = require('lru-cache');
const _ = require('lodash');
const request = require('request');

var sent = LRU({
  max: 1024 * 100
});

module.exports.watch = function(region) {
  const cloudtrail = new AWS.CloudTrail({ region });

  function log(params) {
    var args = [colors.green(region + ': ')].concat([].slice.call(arguments));
    console.log.apply(console, args);
  };

  const ignoredUsers = process.env.IGNORED_USERNAMES ? process.env.IGNORED_USERNAMES.split(',') : [];
  const ignoredUa = process.env.IGNORED_UA ? process.env.IGNORED_UA.split(',') : [];
  const ignoreELBSelfRegistrations = !!process.env.IGNORE_ELB_SELF_REGISTRATIONS;
  const ignoreElastiCacheSnapshots = !!process.env.IGNORE_ELASTICACHE_SNAPSHOTS;

  // If OpsGenie config api key specified, create and send heartbeats
  const heartbeatName = `CloudTrail Watcher: ${region}`;
  if (process.env.OPS_GENIE_API_KEY) {
    request.post({
      url: 'https://api.opsgenie.com/v1/json/heartbeat',
      json: {
        apiKey: process.env.OPS_GENIE_API_KEY,
        name: heartbeatName,
        enabled: true,
        interval: 5,
        intervalUnit: 'minutes',
      },
    }, (err) => {
      if (err) {
        log(`Error creating ${heartbeatName} heartbeat:`, err);
      } else {
        log(`Heartbeat created: ${heartbeatName}`);
      }
    });
  }

  function findEvents(params) {
    log('query with', params);

    cloudtrail.lookupEvents(params, function(err, data) {
      if (err) { return log(err); }

      if (process.env.OPS_GENIE_API_KEY) {
        request.post({
          url: 'https://api.opsgenie.com/v1/json/heartbeat/send',
          json: {
            apiKey: process.env.OPS_GENIE_API_KEY,
            name: heartbeatName,
          },
        }, (err) => {
          if (err) {
            log(`Error creating ${heartbeatName} heartbeat:`, err);
          } else {
            log(`Heartbeat created: ${heartbeatName}`);
          }
        });
      }

      log(`search returned ${data.Events.length} events`);

      var events = data.Events.map(function (event) {
        if (typeof event.CloudTrailEvent === 'string') {
          event.CloudTrailEvent = JSON.parse(event.CloudTrailEvent);
        }
        return event;
      }).filter(function(event) {
        if (event.CloudTrailEvent.userAgent === 'elasticloadbalancing.amazonaws.com') {
          return false;
        }
        if (event.CloudTrailEvent.userAgent === 'autoscaling.amazonaws.com' && event.Username == 'root') {
          return false;
        }
        if (event.EventName == 'AssociateAddress' && event.Username == 'root')
        {
          return false;
        }
        if (event.EventName == 'DescribeAccountLimits' && event.CloudTrailEvent.userAgent == 'support.amazonaws.com') {
          return false;
        }
        if (ignoreELBSelfRegistrations) {
          if (event.Username.match(/i-[0-9a-f]*/gi)) {
            if (event.EventName === 'RegisterInstancesWithLoadBalancer' ||
                event.EventName === 'DeregisterInstancesFromLoadBalancer') {
              return false;
            }
          }
        }

        if (ignoreElastiCacheSnapshots) {
          if (event.EventName === 'CopySnapshot' ||
              event.EventName === 'CreateSnapshot') {
            return false;
          }
        }

        return !sent.get(event.EventId) &&
               !~ignoredUsers.indexOf(event.Username) &&
               !~ignoredUa.indexOf(event.CloudTrailEvent.userAgent);
      });

      events = _.sortBy(events, 'EventTime');

      async.forEach(events, slack.sendEvent, function (err) {
        if (err) {
          console.error(err);
          return process.exit(1);
        }

        events.forEach(function (event) {
          log('reported event: ', [event.EventId, event.EventTime, event.Username, event.EventName].join(' - '));
          sent.set(event.EventId, true);
        });

        if (typeof data.NextToken !== 'undefined' || !data.NextToken) {
          log('No more events in the previous query.');
          return setTimeout(function () {
            delete params.NextToken;
            // AWS takes like 10 minutes to report activity.
            params.StartTime = moment().add(-60, 'm').toDate();
            findEvents(params);
          }, 30 * 1000);
        }

        log('get more records from previous query');
        params.NextToken = data.NextToken;
        findEvents(params);
      });
    });
  }

  findEvents({
    MaxResults: 20,
    StartTime: moment().add(-60, 'm').toDate()
  });
};
