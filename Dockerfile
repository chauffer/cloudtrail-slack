FROM node:6.9-alpine

RUN mkdir /usr/src
RUN mkdir /usr/src/cloudtrail-slack
WORKDIR /usr/src/cloudtrail-slack

COPY package.json .
RUN npm install --production

COPY . .

CMD SLACK_WEBHOOK=$webhook REGIONS=ap-southeast-2 AWS_ACCESS_KEY_ID=$awsid AWS_SECRET_ACCESS_KEY=$awskey ACCOUNT=$account bin/cloudtrail-slack
