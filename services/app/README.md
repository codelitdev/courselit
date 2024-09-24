# Introduction

A batteries-included open-source LMS for everyone. It is an alternative to Teachable, Thinkific, Podia and the likes.

## Getting started

Define and .env file containing the variables described in `Environment variables` section and run the following command

```sh
docker run -p 3000:3000 codelit/courselit-app
```

The app will be available at http://localhost:3000

### Environment variables

**AUTH_SECRET**

A random string to use as a secret to sign the JWT tokens the API generates. Required parameter. No default value.

**DB_CONNECTION_STRING**

The connection string to a remote mongodb instance. Defaults to `mongodb://localhost/app`.

**EMAIL_USER**
The username for your email server.

**EMAIL_PASS**
The password for your email server.

**EMAIL_HOST**
The address of your email server.

**EMAIL_FROM**
The name that appears in the from field of the email sent by CourseLit.

**MEDIALIT_SERVER**
The URL of the MediaLit server. Defaults to `https://medialit.cloud`.

**MEDIALIT_APIKEY**
The API key to access MediaLit.

## Support

Come chat with us in our official [Discord channel](https://discord.gg/GR4bQsN).
