# Introduction

A Material UI based front-end app for [CourseLit Headless CMS](https://www.npmjs.com/package/@courselit/api).

## Getting started

Since the app is based on Next.js framework there is no straight forward way to run it. Please follow the below commands.

```
mv node_modules/@courselit/app/* .
rm -rf node_modules
npm install
npm run build
npm run start
```

### Environment variables

**API_PREFIX**

The path where the API is located on the server. Defaults to `/api`.

**INSECURE**

If you want to serve the app over HTTP, instead of HTTPS, set this to `true`. Defaults to `false`.

## Support

Come chat with us in our official [Spectrum chat](https://spectrum.chat/courselit/general).
