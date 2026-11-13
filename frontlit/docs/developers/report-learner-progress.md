---
title: Report learner progress
description: Read a product's customers, each learner's lesson progress and the sales figures with the API, for dashboards and reports.
nav_order: 130
---

Use these read operations to build a report, sync progress into another system, or show completion in your own app. They need an API key with `products:read`, and `analytics:read` for the figures.

## List a product's customers

```bash
curl "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/customers?page=1&limit=50" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

The response is paged by page number, see [Pagination and filtering](/docs/developers/pagination-and-filtering).

```json
{
  "items": [
    {
      "id": "sca_0190c0de0000700080000000000000a4",
      "membershipId": "lrm_0190c0de0000700080000000000000a3",
      "name": "Maria Silva",
      "email": "maria@example.com",
      "avatar": null,
      "accountStatus": "active",
      "membershipStatus": "active",
      "subscriptionMethod": null,
      "subscriptionId": null,
      "subscription": null,
      "signedUpAt": "2026-11-13T10:00:00.000Z",
      "lastActiveAt": "2026-11-14T08:15:00.000Z",
      "progress": {
        "completedLessons": 3,
        "totalLessons": 10,
        "percentage": 30
      },
      "downloaded": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

| Field | Meaning |
| --- | --- |
| `progress` | Completed published lessons out of all published lessons, and the percentage |
| `membershipStatus` | `active`, `payment_failed`, `expired`, `pending`, `rejected` or `paused` |
| `subscription` | For learners on a subscription or installment plan, its status, billing period and installments paid |
| `downloaded` | For digital downloads, whether the customer has downloaded the files |

## Read one learner's lesson progress

Use the customer `id` from the list to see each lesson and when it was completed.

```bash
curl "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/customers/$CUSTOMER_ID/progress" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

```json
{
  "customer": {
    "id": "sca_0190c0de0000700080000000000000a4",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "avatar": null
  },
  "lessons": [
    {
      "id": "lsn_0190c0de0000700080000000000000a5",
      "title": "Welcome",
      "completed": true,
      "completedAt": "2026-11-14T08:15:00.000Z"
    }
  ]
}
```

## Read sales and completions

Product analytics return sales, customers, completions and downloads for a range, each with growth against the previous period.

```bash
curl "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/analytics?range=30d" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

`range` is one of `1d`, `7d`, `30d`, `90d`, `1y` or `lifetime`, and defaults to `7d`. Sales come with a daily series in `sales.points`, and amounts are in the smallest unit of the response's `currency`, for example cents.

For figures across the whole school, use the school overview operation, `GET /v1/school/overview`, with the same `range` values. It needs `analytics:read`.

## Find learners across products

Learners are also contacts in the school. List contacts with `q`, a `segmentId` or a `filter` on products, tags and activity, see [Pagination and filtering](/docs/developers/pagination-and-filtering).
