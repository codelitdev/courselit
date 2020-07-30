# Introduction

A Material UI based front-end app for [CourseLit Headless CMS](https://www.npmjs.com/package/@courselit/api).

## Getting started

Easily spin up a new CourseLit headless server using the following command.

```sh
docker run --env SITE_URL=http://localhost:3000 --env SSR_SITE_URL=http://localhost:3000 -p 3000:3000 codelit/courselit-frontend

# the app will be available at http://localhost:3000

```

### Environment variables

**SITE_URL**

The public address of the site. Defaults to none.

**API_PREFIX**

The path where the API is located on the server. Defaults to `/api`.

**SSR_SITE_URL**

The server address to resolve `getInitialProps` calls for server side rendering. Defaults to none.

## Support
Come chat with us in our official [Discord channel](https://discord.gg/GR4bQsN).
