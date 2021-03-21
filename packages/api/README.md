# Introduction

A headless CMS for hosting your own teaching courses. Features include course creation, student management, media management and website customisation. [Learn more](https://courselit.codelit.com/).

## Getting started

Easily spin up a new CourseLit headless server using the following command.

```sh
export USER_CONTENT_DIRECTORY=local_directory_to_hold_user_data
export JWT_SECRET=string_of_your_choice
yarn start

# the server will be available at http://localhost/api
```

> The above commands assume that you have a MongoDB server running on your local machine. If that is not the case, specify the DB_CONNECTION_STRING environment as well.

Additionally, you need to have `imagemagick` and `ffmpeg` softwares installed locally for media upload functionality to work.

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

**USE_WEBP**
If this is set to `true`, the app will convert the image being uploaded to WEBP format. The generated thumbnail will be a WEBP file as well.

**WEBP_QUALITY**
The quality of output while converting images to WEBP format. Only applies when `USE_WEBP` is set to `true`. Defaults to `75`.

**DOMAIN**
The actual domain name the live website is bound to. For example `corelit.xyz`.

## Support

Come chat with us in our official [Spectrum chat](https://spectrum.chat/courselit/general).
