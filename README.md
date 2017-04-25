Watch CloudTrail and send notifications of every action to an slack channel.

## Changes from auth0/cloudtrail-slack
- Docker Support
- Support for a couple of extra exlusions:
  - Setting the `IGNORE_ELB_SELF_REGISTRATIONS` env variable will ignore ELB registrations and deregistrations coming from servers (something that can be common with certain Kubernetes versions).
  - Setting the `IGNORE_ELASTICACHE_SNAPSHOTS` env variable will ignore create or copy snapshot commands.
  - Setting the `UTC_OFFSET` env variable (in minutes) will allow you to have non-utc timestamps in Slack for Event Time.

## Installation

```
git clone https://github.com/robscott/cloudtrail-slack
cd cloudtrail-slack
npm install
```

## Usage

Configure a daemon that runs the following command:

```
docker run --env \
webhook="https://hooks.slack.com/services/....." \
--env awsid="..." \
--env awskey="...." cloudtrail
```

The AWS IAM user you have will need to have `cloudtrail:LookupEvents` access.

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com) with some small modifications by Rob Scott.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
