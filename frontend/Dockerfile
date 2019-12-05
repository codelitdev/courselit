FROM node:12.9.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install dependencies
COPY package.json yarn.lock /usr/src/app/
RUN npm install

# copy local files to container
COPY . /usr/src/app

RUN npm run build

CMD [ "npm", "start" ]