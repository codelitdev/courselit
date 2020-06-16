# Introduction

A proxy server to route traffic to courselit-backend and courselit-frontend.

> This container on its own is useless unless you have courselit-backend and courselit-frontend containers running via the names 'backend' and 'frontend' respectively and they should be on the same Docker network.

## Docker

Easily spin up a new courselit-proxy server using the following command.

### Without SSL certificate

```sh
docker run recurze/courselit-proxy
```

### With SSL certificate

```sh
docker run --env DOMAIN=<your_domain.com> -v <directory_containing_letsencrypt_certificate>:/etc/letsencrypt recurze/courselit-proxy
```

where `directory_containing_letsencrypt_certificate` is the directory on your host system which contains the ssl certificate issued by [Let's Encrypt](https://letsencrypt.org/).

### Environment variables

**DOMAIN**

The domain name for which the SSL certificate is issued. It is only required if you want to serve the traffic over SSL. Optional parameter. No default value.