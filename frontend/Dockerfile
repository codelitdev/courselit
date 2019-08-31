FROM node:12.9.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install dependencies
COPY package.json /usr/src/app
RUN npm install

# copy local files to container
COPY . /usr/src/app

# build next app
# ARG backend
# ENV BACKEND ${backend}
RUN npm run build

CMD [ "npm", "start" ]