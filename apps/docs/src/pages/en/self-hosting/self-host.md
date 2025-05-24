---
title: CourseLit Self Hosting Guide
description: CourseLit Self Hosting Guide
layout: ../../../layouts/MainLayout.astro
---

> **Before you self-host**: Although we believe in the power of hosting your own software, we still think that buying a subscription to [CourseLit](https://courselit.app) will save you a lot of time and money of maintaining your own CourseLit instance. Check out our [pricing](https://courselit.app/#pricing).

We offer two ways to self-host CourseLit, which are as follows.

1. On [Vercel](https://vercel.com).
2. On a VPS using Docker.

## Hosting on Vercel

To quickly spin up an instance of CourseLit on Vercel, click the following button.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcodelitdev%2Fcourselit&env=DB_CONNECTION_STRING,AUTH_SECRET,SUPER_ADMIN_EMAIL,EMAIL_USER,EMAIL_PASS,EMAIL_HOST,EMAIL_FROM&envDescription=Configuration%20for%20your%20app&project-name=courselit&root-directory=apps%2Fweb&build-command=cd+..%2F+%26%26+NODE_OPTIONS%3D--openssl-legacy-provider+yarn+build)

> Note: Certain essential features like file uploads, email automation and drip content will not work as these cannot run on a serverless platform like Vercel. However, you can make file uploads work by using the hosted instance of [MediaLit](https://medialit.cloud) (our open-source service for file uploads, which CourseLit uses under the hood) for free.

## Hosting on a VPS using Docker

If you want to harness the full capabilities of CourseLit, you can deploy it via Docker. We recommend [docker-compose](https://docs.docker.com/compose/) for hosting CourseLit.

Run the following commands in order.

##### 1. Download `docker-compose.yml` file onto your system.

```sh
curl https://raw.githubusercontent.com/codelitdev/courselit/main/deployment/docker/docker-compose.yml --output docker-compose.yml --silent
```

##### 2. Start the app

```sh
SUPER_ADMIN_EMAIL=your@email.com docker compose up
```

The email you specify here will be set as the super admin of your CourseLit instance.

> **Troubleshooting**: If you are going to run this command multiple times, be aware that the super admin user will only be created once and with the email ID you provided the very first time. Hence, if you are not able to access the `/dashboard` route, it is most likely that the email you are using is not associated with the super admin account. Try removing the Docker containers by running `SUPER_ADMIN_EMAIL=your@email.com docker compose down` and start again.

##### 3. Test drive your CourseLit school

Visit [http://localhost](http://localhost) to see your school. There won't be much to see at this point. You need to customise it.

##### 4. Log in to your school

Click on the top right icon and then on the [login](http://localhost/login) menu. Enter the email you provided in Step #2 to log in. Since, we haven't set the mail yet, the magic link to log in will be dumped onto the `docker compose` logs. Locate the link and click on it (or copy paste it in the browser) to log in.

The login link looks something like `http://localhost/login?token=some-long-string`.

##### 5. Customise your school

Visit [http://localhost/dashboard](http://localhost/dashboard) to customise your school.

> Note: This will be a barebones instance. Things like mails and file uploads will not work. You can follow rest of this guide to set those things up.

### Enabling emails

If you want to send emails (including Magic links to log in) using CourseLit, it is easy as well.

1. Create an enviroment file called `.env` with the following content (in the same directory as your `docker-compose.yml` file) and replace the values accordingly.

```
SUPER_ADMIN_EMAIL=your@email.com

# Email
EMAIL_HOST=host
EMAIL_USER=user
EMAIL_PASS=pass
EMAIL_FROM=from_field
```

2. Restart the app

```
docker compose stop
docker compose up
```

### Enabling file uploads

If you want to upload media (images, videos etc.) to your school, you need to configure [MediaLit](https://hub.docker.com/r/codelit/medialit). MediaLit powers CourseLit's media management and optimisation. MediaLit offers a Docker image which you can self host.

To self host, follow the following steps.

1.  Uncomment the block under the `app` service in `docker-compose.yml` which says the following.

    ```
    # - MEDIALIT_APIKEY=${MEDIALIT_APIKEY}
    # - MEDIALIT_SERVER=http://medialit
    ```

2.  Uncomment the block titled `MediaLit` in `docker-compose.yml`.

3.  In your `.env` file, paste the following code (under the existing content) and change the values as per your environment.

    ```
    # Medialit Server
    CLOUD_ENDPOINT=aws_s3_endpoint
    CLOUD_REGION=aws_s3_region
    CLOUD_KEY=aws_s3_key
    CLOUD_SECRET=aws_s3_secret
    CLOUD_BUCKET_NAME=aws_s3_bucket_name
    S3_ENDPOINT=aws_s3_cdn_endpoint
    CLOUD_PREFIX=medialit
    MEDIALIT_APIKEY=key_to_be_obtained_docker_compose_logs
    ```

    To learn how to configure an AWS S3 bucket for MediaLit, click [here](https://github.com/codelitdev/medialit?tab=readme-ov-file#setting-up-correct-access-on-aws-s3-bucket).

4.  Start the MediaLit service once to generate an API key to use with CourseLit.

    ```sh
    docker compose up medialit
    ```

    The above command will start the MediaLit service and display a fresh API key on the console. The relevant logs will look something like the following.

    ```sh
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @     API key: testcktI8Sa71QUgYtest      @
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    ```

    Copy the API key.

5.  Update the `MEDIALIT_APIKEY` value in `.env` file and restart the service once again.

6.  That's it! You now have a fully functioning LMS powered by CourseLit and MediaLit.

## Hosted version

If this is too technical for you to handle, CourseLit's hosted version is available at [CourseLit.app](https://courselit.app).

It is managed by the team behind CourseLit. We will take care of everything, just come with your team and content.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
