---
title: Webhooks and events
description: Find out which webhooks CourseLit receives, and which options you have today to react to changes in a school.
nav_order: 80
---

CourseLit does not send webhooks to your own endpoints. There is no way to subscribe a URL to events such as a new learner, a completed lesson or a payment. To react to changes, read the data with the API on a schedule.

| You want to know about | Read this |
| --- | --- |
| New customers and their progress in a product | The product's customer list, as described in [Report learner progress](/docs/developers/report-learner-progress) |
| Sales and completions | The product analytics and the school overview |
| New contacts | The contacts list, paged as described in [Pagination and filtering](/docs/developers/pagination-and-filtering) |

## Payment provider webhooks

CourseLit itself receives webhooks from the payment providers a school connects, which are Stripe, Lemon Squeezy and Razorpay. When a school saves its provider settings in the admin, CourseLit registers the webhook with the provider where the provider allows it. You do not need to configure anything for these.

The receiving endpoints are `/v1/storefront/webhooks/stripe`, `/v1/storefront/webhooks/lemonsqueezy` and `/v1/storefront/webhooks/razorpay` on the API host. CourseLit verifies each delivery against the school's provider secret before it acts on it, and ignores events that are not about a CourseLit purchase.

These endpoints exist for the providers. They are not a way to send events into a school from your own systems, and a delivery that fails signature verification is rejected with `401`.

A self-hosted deployment can control the public address the providers call with the `PAYMENT_WEBHOOK_BASE_URL` environment variable, see [Self-hosting](/docs/self-hosting).
