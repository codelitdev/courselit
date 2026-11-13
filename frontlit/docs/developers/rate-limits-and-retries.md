---
title: Rate limits and retries
description: Learn the request limits of the CourseLit API, how failed API key attempts are throttled, and how to retry safely without idempotency keys.
nav_order: 70
---

The API limits how fast a single client can call it, and it limits repeated failed authentication separately.

## Request limit

Requests are counted per client IP address, in one-minute windows. By default a production deployment allows 1,200 requests per minute per address, and requests from the same machine as the API, such as health probes, have a much higher allowance. The operator of a deployment can change the limit.

A request over the limit returns `429` with the code `rate_limited` and a `Retry-After: 60` header.

```json
{
  "code": "rate_limited",
  "message": "The request was rate limited."
}
```

Wait for the number of seconds in `Retry-After` before you send the next request. Build your client around the header instead of the default number.

Some endpoints have tighter limits of their own, for example dynamic OAuth client registration allows 20 requests per minute.

## Failed API key attempts

Failed attempts with an invalid, revoked or expired key are counted per client address. After 30 failures within five minutes, the API refuses every further API key request from that address, valid keys included, until the window slides past the oldest failure. The error is `rate_limited`, and `details.retryAfterSeconds` says how long to wait.

Successful requests do not count toward this limit. If an automation starts failing with `401`, fix the key before retrying, otherwise you will lock the address out.

## Retries and idempotency

The API does not support idempotency keys. Retry according to what an operation does.

| Operation kind | Safe to retry? |
| --- | --- |
| Reads, meaning every `GET` | Yes |
| `PATCH` and `PUT` that set fields | Yes. Sending the same values again leaves the same result. |
| Granting a learner access to a product | Yes. It is idempotent per learner and product, and the access email is sent only the first time. |
| Creating a resource with `POST`, such as a product, section, lesson or plan | No. A retry after a timeout can create a duplicate, so list the resource first to see whether the first attempt succeeded. |
| Deleting | Yes, but a repeat is expected to return `404` once the resource is gone. |

Two creations are protected by uniqueness rules instead. A product slug must be unique, and a product cannot have two active plans of the same type. A duplicate returns `409` with the code `conflict`.

The MCP tool `apply_course_outline` is built to be retried. It skips sections and lessons whose titles already exist.

## Backoff

For `429`, `500`, `502`, `503` and network timeouts, wait and retry with exponential backoff and jitter, for example 1, 2, 4 and 8 seconds, and stop after a few attempts.
