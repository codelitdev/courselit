# Introduction

A headless CMS for hosting your own teaching courses. Features include course creation, student management, media management and website customisation. [Learn more](https://courselit.recurze.com/).

## Getting started

Easily spin up a new CourseLit server using the following command.

```
yarn start
```

### Environment variables

**USER_CONTENT_DIRECTORY**

The CourseLit server needs a place to store user created content like media uploads. You can specify that location by setting this environment variable. Required parameter. No default value.

**JWT_SECRET**

A random string to use as a secret to sign the JWT tokens the API generates. Required parameter. No default value.

**DB_CONNECTION_STRING**

The connection string to a remote mongodb instance. Defaults to `mongodb://localhost/app`.

**PORT**

The port to run the server on. Defaults to `80`.

**API_PREFIX**

This will make the server available at `/<API_PREFIX>` path. Defaults to `/api`.

**JWT_EXPIRES_IN**

The duration after while the generated JWT expires. For more information click [this](https://www.npmjs.com/package/jsonwebtoken) link. Defaults to `1d`.

## Development

### Running on local
1. Install MongoDB.
2. Install the following softwares.
```
apt install imagemagick ffmpeg
```
3. Start the development server.
```
yarn dev
```
