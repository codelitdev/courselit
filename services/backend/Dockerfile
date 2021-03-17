FROM node:12.9.0-alpine

# install required softwares
RUN apk add --no-cache ffmpeg imagemagick libwebp libwebp-tools

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy files
COPY packages/api .

# install dependencies
RUN npm install

CMD ["npm", "start", "--silent"]