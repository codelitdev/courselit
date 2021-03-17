FROM node:12.9.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy files
COPY packages/app .

# build the app
RUN npm install
RUN npm run build

CMD [ "npm", "start" ]