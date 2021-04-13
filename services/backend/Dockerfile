FROM node:15.14.0-buster

# install required softwares
RUN apt-get update && apt-get -y install ffmpeg imagemagick webp

# create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy files
COPY packages/api .

# install dependencies
RUN npm install

CMD ["npm", "start", "--silent"]