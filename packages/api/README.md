# Introduction

A headless CMS for course management. Supports course creation, student management, payments and user authentication.

## Getting started

Easily spin up a new courselit-backend server using the following command

```
docker run -v <content_folder>:/data codelit/courselit-backend
```

where `content_folder` is the directory on your host system which you need to mount as a volume to the container. It is used to store user generated content like uploads.

### Environment variables

**API_PREFIX**

This will make the server available at `/<API_PREFIX>` path. Defaults to `/api`.

**DB_CONNECTION_STRING**

The connection string to a remote mongodb instance. Defaults to `mongodb://localhost/app`.

**JWT_SECRET**

A random string to use as a secret to sign the JWT tokens the API generates. Required parameter. No default value.

**JWT_EXPIRES_IN**

The duration after while the generated JWT expires. For more information [check out here](https://www.npmjs.com/package/jsonwebtoken). Optional parameter. Defaults to `1d`.


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
