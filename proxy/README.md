# Introduction

A proxy server to route traffic to courselit-backend and courselit-frontend.

> This container on its own is useless unless you have courselit-backend and courselit-frontend containers running via the names 'backend' and 'frontend' respectively and they should be on the same docker network.

## Docker

Easily spin up a new courselit-backend server using the following command

```
docker run -v <directory_containing_letsencrypt_certificate>:/etc/letsencrypt codelit/courselit-backend
```

where `directory_containing_letsencrypt_certificate` is the directory on your host system which contains the ssl certificate issued by [Let's Encrypt](https://letsencrypt.org/).

### Environment variables

**DOMAIN**

The site address, to spot the letsencrypt certificate.