FROM node:6.9-alpine

RUN mkdir /usr/src
RUN mkdir /usr/src/cloudtrail-slack
WORKDIR /usr/src/cloudtrail-slack

COPY package.json .
RUN npm install --production

COPY . .

CMD bin/cloudtrail-slack
