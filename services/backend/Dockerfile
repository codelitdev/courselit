FROM node:12.9.0-alpine

# install required softwares
RUN apk add --no-cache ffmpeg imagemagick webp

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install dependencies
COPY package.json /usr/src/app 
RUN npm install

# copy local files to container
COPY . /usr/src/app

CMD ["npm", "start", "--silent"]