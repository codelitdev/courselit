# Introduction

A Material UI based front-end app for [CourseLit Headless CMS](https://www.npmjs.com/package/@courselit/api).

## Getting started

Easily spin up a new CourseLit headless server using the following command.

```sh
docker run --env SITE_URL=http://localhost:3000 --env SSR_SITE_URL=http://localhost:3000 -p 3000:3000 codelit/courselit-frontend

# the app will be available at http://localhost:3000

```

### Environment variables

**JWT_SECRET**

A random string to use as a secret to sign the JWT tokens the API generates. Required parameter. No default value.

**DB_CONNECTION_STRING**

The connection string to a remote mongodb instance. Defaults to `mongodb://localhost/app`.

**EMAIL_USER**
The username for your email server

**EMAIL_PASS**
The password for your email server

**EMAIL_HOST**
The address of your email server

**EMAIL_FROM**
The name that appears in the from field of the email sent by CourseLit

**MEDIALIT_SERVER**
The URL of the MediaLit server

**MEDIALIT_APIKEY**
The API key to access MediaLit

## Support
Come chat with us in our official [Discord channel](https://discord.gg/GR4bQsN).
