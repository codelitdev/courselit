FROM node:12.9.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install @courselit/app@latest

RUN mv node_modules/@courselit/app/* .
RUN rm -rf node_modules

RUN npm install
RUN npm run build

CMD [ "npm", "start" ]