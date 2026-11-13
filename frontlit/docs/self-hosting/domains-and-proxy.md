---
title: Domains and reverse proxy
description: Learn which hostnames a CourseLit deployment needs, how they map to the services, and how custom domains are verified.
nav_order: 40
---

A deployment answers on three kinds of hostnames. A reverse proxy in front of the services decides which service gets which hostname. The CourseLit repository does not include a proxy configuration, so you set this up with the proxy of your choice.

## Hostnames and services

| Hostname | Goes to | Notes |
| --- | --- | --- |
| The admin hostname, such as `admin.example.com` | Admin, port 3000 | Set `WEB_ORIGIN` to this origin |
| The API hostname, such as `api.example.com` | API, port 4000 | Set `PUBLIC_API_URL` to this origin. Needed by integrations and AI assistants. |
| Every subdomain of the platform domain, such as `myschool.example.com` | Storefront, port 3001 | Set `PLATFORM_SITE_DOMAIN` to `example.com`. Add a wildcard DNS record. |
| A school's custom domain, such as `learn.myschool.com` | Storefront, port 3001 | Verified by the school in the admin |

The admin and the storefront reach the API on the private address in their `API_URL`. Browsers never need to call the API directly for the dashboard or the school websites. The API hostname must be public for the REST API, the MCP server and OAuth sign-in of assistants. The issuer and the OAuth metadata are built from `PUBLIC_API_URL`, so it must match the address clients use.

## What the proxy must do

- **Terminate HTTPS** for all of the hostnames. The API builds storefront addresses with `https` for every host except `localhost` names.
- **Keep the original `Host` header** when it forwards to the storefront. The storefront reads the hostname and asks the API which school it belongs to, with `GET /v1/public/resolve-host?host=` followed by the hostname. The API never chooses a school from the host of a request to itself.
- **Set `X-Forwarded-For`** to the real client address on requests to the API and the admin. The API takes the first value for rate limiting, so make sure clients cannot reach the API directly with a header of their own.

## Wildcard school subdomains

When a school is created, its default address is its subdomain on `PLATFORM_SITE_DOMAIN`, for example `myschool.example.com`. Create a wildcard DNS record for `*.example.com` that points to your proxy, and obtain a wildcard certificate for it.

## Custom domains

A school can attach one custom domain in its settings. The admin shows the school two DNS records to create.

| Record | Name | Value |
| --- | --- | --- |
| TXT | `_courselit-verification` followed by a dot and the domain | A token that CourseLit generates |
| CNAME, or ALIAS at the apex | The domain | `sites.` followed by your platform domain |

Set `CUSTOM_DOMAIN_CNAME_TARGET` to change the CNAME value, `CUSTOM_DOMAIN_TXT_RECORD_NAME` to change the TXT record name, and `CUSTOM_DOMAIN_A_RECORDS` to show IP addresses for apex domains. See [Configuration](/docs/self-hosting/configuration).

The CNAME target must resolve to your proxy. Verification checks both the TXT and the CNAME records.

To avoid issuing certificates for hostnames you do not serve, have your proxy ask the API before it requests a certificate or routes a hostname. The call `GET /v1/public/resolve-host?host=` followed by the hostname answers `200` with the school's `schoolId`, `subdomain` and `name` when the host is a verified custom domain, or a subdomain of the platform domain, of a school that is not deleted. It answers `404` for anything else, and it needs no credentials.

## Payment provider webhooks

Payment providers deliver events to `/api/v1/storefront/webhooks/` followed by `stripe`, `lemonsqueezy` or `razorpay` on the admin origin, which forwards them to the API. If the admin origin is not reachable from the internet, set `PAYMENT_WEBHOOK_BASE_URL` to a public base address. The final address is that base followed by `/v1/storefront/webhooks/` and the provider name, and it must reach the API's route of that path. The address is registered with the provider when a school saves its payment settings, so set the variable before schools configure payments.
