---
title: Self Hosting CourseLit
description: Hosting CourseLit on your own server
layout: ../../layouts/MainLayout.astro
---

We offer a Docker image which you can easily host in any environment where Docker is supported.

We recommend hosting it using [docker-compose](https://docs.docker.com/compose/). Create a new file called `.env`, paste the following content in the file and change the values as per your environment.

```
DB_CONNECTION_STRING=mongodb_connection_string
JWT_SECRET=long_random_string
TAG=latest
SUPER_ADMIN_EMAIL=john@doe.com

# Email
EMAIL_HOST=host
EMAIL_USER=user
EMAIL_PASS=pass
EMAIL_FROM=from_field
```

Now, create a new file called docker-compose.yml and paste the following in the file.

```
version: "3"

services:
  app:
    image: codelit/courselit-app:${TAG}
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DB_CONNECTION_STRING=${DB_CONNECTION_STRING}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_FROM=${EMAIL_FROM}
      - SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
    ports:
      - "3000:3000"
    container_name: app
    restart: on-failure
```

Now, you can start CourseLit using the following command.

```
docker-compose up
```

Visit http://localhost:3000 to see CourseLit in action.

## Hosting MediaLit

If you want to upload media (images, videos etc.) to your school, you need to configure MediaLit. MediaLit powers CourseLit's media management and optimisation.
You can use the cloud hosted version (paid) or self host it. MediaLit offers a Docker image which we can self host.

To self host, paste the following code in your `docker-compose.yml` file, under the existing content.

```
medialit:
  image: codelit/medialit
  environment:
    - DB_CONNECTION_STRING=${DB_CONNECTION_STRING_MEDIALIT}
    - CLOUD_ENDPOINT=${CLOUD_ENDPOINT}
    - CLOUD_REGION=${CLOUD_REGION}
    - CLOUD_KEY=${CLOUD_KEY}
    - CLOUD_SECRET=${CLOUD_SECRET}
    - CLOUD_BUCKET_NAME=${CLOUD_BUCKET_NAME}
    - CDN_ENDPOINT=${CDN_ENDPOINT}
    - TEMP_FILE_DIR_FOR_UPLOADS=${TEMP_FILE_DIR_FOR_UPLOADS}
    - PORT=8000
    - EMAIL_HOST=${EMAIL_HOST}
    - EMAIL_USER=${EMAIL_USER}
    - EMAIL_PASS=${EMAIL_PASS}
    - EMAIL_FROM=${EMAIL_FROM}
    - ENABLE_TRUST_PROXY=${ENABLE_TRUST_PROXY}
    - CLOUD_PREFIX=${CLOUD_PREFIX}
  ports:
    - "8000:8000"
  container_name: medialit
  restart: on-failure
```

In your `.env` file, paste the following code (under the existing content) and change the values as per your environment.

```
# Medialit Server
DB_CONNECTION_STRING_MEDIALIT=mongodb_connection_string
CLOUD_ENDPOINT=aws_s3_endpoint
CLOUD_REGION=aws_s3_region
CLOUD_KEY=aws_s3_key
CLOUD_SECRET=aws_s3_secret
CLOUD_BUCKET_NAME=aws_s3_bucket_name
CDN_ENDPOINT=aws_s3_cdn_endpoint
TEMP_FILE_DIR_FOR_UPLOADS=path_to_directory
PORT=8000
CLOUD_PREFIX=medialit
```

Restart the services by running the following commands.

```
docker-compose down
docker-compose up
```

> **NOTE**: The MediaLit installation is done but is not yet integrated with CourseLit! There are a few more steps. Keep reading.

### Generate An API Key On MediaLit

First you need to obtain the container id of your MediaLit instance. To do this, run:

```
docker ps
```

Once you have the ID of the `MediaLit` container, run the following to generate an API key

```
docker exec <container_id_from_above_step> node dist/scripts/create-local-user.js
```

Keep the generated API key safe. We will use it in the following step.

### Using Self-hosted MediaLit With CourseLit

Open the `.env` file and add the following lines.

```
MEDIALIT_SERVER=http://localhost:8000
MEDIALIT_APIKEY=key_from_above_step
```

Now, in the `docker-compose.yml` file, add the following two lines under the `environment` block of the `app` service.

```
      - MEDIALIT_APIKEY=${MEDIALIT_APIKEY}
      - MEDIALIT_SERVER=${MEDIALIT_SERVER}
```

Restart the server by running the following commands.

```
docker-compose down
docker-compose up
```

That's it! You now have a fully functioning LMS powered by CourseLit.

## Logging into the admin dashboard

CourseLit sets up a super admin user account using the email address we provide in the `SUPER_ADMIN_EMAIL` field in the `.env` file.

Click on the profile button located at the top right corner of the homepage, then click on the `login` option to go to the login screen. Enter your email in the login form to get a magic link in your inbox.

## Stuck somewhere?

We are always there for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
