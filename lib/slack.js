var moment = require('moment');

var Slack = require('slack-node');
var slack = new Slack();
slack.setWebhook(process.env.SLACK_WEBHOOK);

var _ = require('lodash');
var async = require('async');
var moment = require('moment');

var template = _.template('*${EventName}* from *${Username}* | *Master Account*');

var attachmentTextTemplate = _.template('<https://ap-southeast-2.console.aws.amazon.com/cloudtrail/home?region=${region}|Open CloudTrail Console>');

var specialCases = {
  awsRegion: 'AWS Region',
  sourceIPAddress: 'Source IP Address',
  eventID: 'Event ID',
};

function friendlyTitle (field) {
  if (specialCases[field]) {
    return specialCases[field];
  }
  return field.replace(/([A-Z])/g, ' $1')
              .replace(/^./, function(str){ return str.toUpperCase(); });
}

var eventFields = ['eventSource', 'eventName', 'awsRegion',
                   'sourceIPAddress', 'userAgent', 'eventTime', 'eventID'];

var queue = async.queue(function (event, callback) {
  event.CloudTrailEvent = typeof event.CloudTrailEvent === 'string' ? JSON.parse(event.CloudTrailEvent) : event.CloudTrailEvent;
  event.EventTimeFromNow = moment(event.EventTime).fromNow();

  var color = 'good';
  if (event.EventName.match(/delete/i) || event.EventName.match(/revoke/i)) {
    color = 'danger';
  }

  var meta = _(event.CloudTrailEvent)
              .pick(eventFields)
              .map(function (value, key) {

                if (key === 'eventTime') {
                  value = moment(value).utc().utcOffset(parseInt(process.env.UTC_OFFSET, 10) || 0).format('hh:mm:ss a');
                }

                return {
                  title: friendlyTitle(key),
                  value: value,
                  short: true
                };
              }).value();

  slack.webhook({
    text: template(event),
    attachments: [
      {
        text: attachmentTextTemplate({ region: event.CloudTrailEvent.awsRegion }),
        color: color,
        fields: meta
      }
    ]
  }, callback);
}, 1);

module.exports.sendEvent = function (event, callback) {
  queue.push(event, callback);
};
