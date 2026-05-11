---
title: Manage products and content using CourseLit API
description: Create products, payment plans, sections, lessons, and media-backed content using the CourseLit API
layout: ../../../layouts/MainLayout.astro
---

The CourseLit public API can manage products and course content programmatically. Use it when you are building another frontend for CourseLit, such as an AI-assisted learning app that creates courses, uploads media, and publishes products through CourseLit.

For interactive schemas and examples, open the Swagger API reference from your CourseLit dashboard.

## Authentication

Send your API key in the `x-api-key` header.

```bash
curl https://your-school.example.com/api/products \
  -H "x-api-key: your-api-key" \
  -H "accept: application/json"
```

API keys are school-level credentials. CourseLit resolves the school owner for the current domain and uses that owner as the actor for permission checks and resource ownership. Do not send `creatorId`, `userId`, or similar ownership fields unless an endpoint explicitly documents the field as the customer being managed.

## Product workflow

Create a product as a draft first.

```http
POST /api/products
```

The draft creation endpoint accepts only:

```json
{
    "title": "AI Foundations",
    "type": "course"
}
```

After the draft exists, update metadata with:

```http
PATCH /api/products/{productId}
```

Use this endpoint for fields such as `slug`, `description`, `published`, `privacy`, `tags`, and `featuredImage`. `description` is a JSON-stringified Tiptap/ProseMirror document.

Do not use the legacy `course.cost` or `course.costType` fields. Pricing is managed with payment plans.

## Payment plans

Course and download products require a payment plan before publishing. Use:

```http
GET /api/products/{productId}/payment-plans
POST /api/products/{productId}/payment-plans
GET /api/products/{productId}/payment-plans/{planId}
PATCH /api/products/{productId}/payment-plans/{planId}
DELETE /api/products/{productId}/payment-plans/{planId}
POST /api/products/{productId}/payment-plans/{planId}/default
```

Deleting a payment plan archives it. The API follows the same validations as the dashboard, including checks for paid plans and default payment plans.

## Sections and lessons

Structured products can be organized with sections and lessons.

```http
GET /api/products/{productId}/sections
POST /api/products/{productId}/sections
PATCH /api/products/{productId}/sections/{sectionId}
DELETE /api/products/{productId}/sections/{sectionId}
POST /api/products/{productId}/sections/reorder
GET /api/products/{productId}/lessons
POST /api/products/{productId}/lessons
GET /api/products/{productId}/lessons/{lessonId}
PATCH /api/products/{productId}/lessons/{lessonId}
DELETE /api/products/{productId}/lessons/{lessonId}
POST /api/products/{productId}/lessons/{lessonId}/move
```

Text lessons accept Tiptap/ProseMirror JSON in `content`.

```json
{
    "title": "Welcome",
    "type": "text",
    "content": {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    { "type": "text", "text": "Welcome to the course." }
                ]
            }
        ]
    }
}
```

SCORM lesson creation is not supported by the public API. If you send a SCORM lesson type, the API returns a `not_supported` error.

## Media-backed lessons

Upload files directly to MediaLit, then reference the returned `mediaId` when creating or updating video, audio, PDF, or file lessons.

1. Generate an upload signature:

```http
POST /api/media/presigned
```

2. Upload the file to MediaLit using the returned `signature` and `endpoint`.

See the MediaLit upload guide: <a href="https://docs.medialit.cloud/api/uploadMedia" target="_blank">https://docs.medialit.cloud/api/uploadMedia</a>.

3. Reference the uploaded media in a lesson:

```json
{
    "title": "Lecture video",
    "type": "video",
    "media": {
        "mediaId": "media_123"
    }
}
```

## Publishing

Publish with:

```http
PATCH /api/products/{productId}
```

Set `published` to `true` only after the product is ready and has the required payment plan setup. The API uses existing CourseLit publishing validation.
