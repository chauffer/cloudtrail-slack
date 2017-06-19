FROM node:8-alpine

RUN mkdir -p /usr/src/cloudtrail-slack
WORKDIR /usr/src/cloudtrail-slack

COPY package.json .
RUN npm install --production

COPY . .

CMD SLACK_WEBHOOK=$webhook AWS_ACCESS_KEY_ID=$awsid AWS_SECRET_ACCESS_KEY=$awskey ACCOUNT=$account bin/cloudtrail-slack
