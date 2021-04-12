FROM node:15.14.0-buster

# install required softwares
RUN apt get ffmpeg imagemagick libwebp libwebp-tools

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy files
COPY packages/api .

# install dependencies
RUN npm install

CMD ["npm", "start", "--silent"]