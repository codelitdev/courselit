FROM node:17.6.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy files
COPY apps/web .

# build the app
RUN npm install
RUN npm run build

CMD [ "npm", "start" ]