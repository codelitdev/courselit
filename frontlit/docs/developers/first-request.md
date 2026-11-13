---
title: Make your first request
description: Check your API key, list your products and create a product with curl.
nav_order: 40
---

This page takes you from a new API key to a created product in three requests.

Before you start, create an API key with the `products:write` permission, as described in [Authentication](/docs/developers/authentication), and set two environment variables.

```bash
export COURSELIT_API_URL="https://api.courselit.app"
export COURSELIT_API_KEY="cl_live_key_..."
```

If you self-host CourseLit, set `COURSELIT_API_URL` to your API address instead.

<Steps>

<Step>

### Check the service

The `/health` endpoint needs no credentials.

```bash
curl "$COURSELIT_API_URL/health"
```

```json
{
  "status": "ok",
  "service": "courselit-api",
  "time": "2026-11-13T09:30:00.000Z",
  "version": "1.0.0-alpha.0"
}
```

</Step>

<Step>

### List products

Send the key in the `x-api-key` header. `limit` is optional and defaults to 25.

```bash
curl "$COURSELIT_API_URL/v1/products?limit=5" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

A new school has no products yet, so the list is empty.

```json
{
  "items": [],
  "nextCursor": null
}
```

A `401` response with the code `unauthenticated` means the key is malformed, revoked or expired. A `403` response with the code `forbidden` means the key lacks `products:read`.

</Step>

<Step>

### Create a product

Create a course. `kind` is `course` or `download` and defaults to `course`. A new product is always a draft.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "course",
    "title": "Intro to watercolor",
    "description": "Learn the basics of painting with watercolor."
  }'
```

The response is `201` with the new product.

```json
{
  "id": "prd_0190c0de0000700080000000000000a1",
  "schoolId": "sch_0190c0de0000700080000000000000a0",
  "kind": "course",
  "status": "draft",
  "slug": "intro-to-watercolor",
  "title": "Intro to watercolor",
  "description": "Learn the basics of painting with watercolor.",
  "featuredImage": null,
  "privacy": "unlisted",
  "leadMagnet": false,
  "certificate": false,
  "discussions": false,
  "newLessonStatus": "draft",
  "includedWithCommunity": false,
  "discussionSpaceId": null,
  "publishedAt": null,
  "createdAt": "2026-11-13T09:31:00.000Z",
  "updatedAt": "2026-11-13T09:31:00.000Z"
}
```

Keep the `id`. Every later call on this product uses it. A new product is `unlisted`, which means it is reachable by its link but not listed in the school's catalog. You change that with `privacy` when you update the product. The `slug` is made from the title unless you send your own, and it must be unique in the school, otherwise the call fails with `409` and the code `conflict`.

</Step>

</Steps>

The product appears in the admin under **Products**. To add content and make it live, continue with [Create and publish a course](/docs/developers/create-and-publish-a-course).

## Things to know about IDs and fields

- IDs are opaque strings made of a short type prefix, an underscore and 32 hexadecimal characters. Pass them back exactly as received.
- Timestamps are ISO 8601 strings in UTC.
- Money is returned in the smallest currency unit, for example cents. Fields that hold such an amount end in `Minor`, such as `salesAmountMinor`.
