---
title: Manage customers and progress using CourseLit API
description: Enroll customers and read product progress using the CourseLit API
layout: ../../../layouts/MainLayout.astro
---

The CourseLit public API can enroll customers into products and read enrollment/progress snapshots. These endpoints are useful for external CRMs, custom learning apps, and automation workflows that use CourseLit as the system of record.

For interactive schemas and examples, open the Swagger API reference from your CourseLit dashboard.

## Authentication

Send your API key in the `x-api-key` header.

```bash
curl https://your-school.example.com/api/products/product_123/customers \
  -H "x-api-key: your-api-key" \
  -H "accept: application/json"
```

API keys are school-level credentials. CourseLit resolves the school owner for the current domain and uses that owner as the actor for permission checks. Customer fields such as `userId`, memberships, and progress still refer to the customer being managed, not to the API key or school owner.

## Invite a customer

Use:

```http
POST /api/products/{productId}/customers/invitations
```

Request body:

```json
{
    "email": "student@example.com",
    "tags": ["cohort-2026"]
}
```

The endpoint uses CourseLit's existing customer invitation behavior. It creates or reuses a customer user, enrolls that customer into the product, and sends the invitation email.

## List product customers

Use:

```http
GET /api/products/{productId}/customers
```

The response is a paginated product roster. Supported query parameters include `page`, `limit`, `status`, and `search`.

## Read customer progress

Use:

```http
GET /api/products/{productId}/customers/{userId}/progress
```

Progress is read-only in the public API. The API reports existing CourseLit progress state such as completed lesson IDs, total published lessons, progress percentage, enrollment timestamps, and download state for download products.

The public API does not provide customer-runtime `/api/me` endpoints and does not let integrations arbitrarily set customer progress.
