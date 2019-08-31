FROM node:12.9.0-alpine

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install dependencies
COPY package.json /usr/src/app 
# RUN apk add --no-cache --virtual .gyp python make g++ \
#     && npm install \
#     && apk del .gyp
RUN npm install

# copy local files to container
COPY . /usr/src/app

CMD ["npm", "start"]