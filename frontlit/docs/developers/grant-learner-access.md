---
title: Grant a learner access
description: Give a person access to a published product through the API, check their membership, and take access away again.
nav_order: 120
---

Use this when you sell or enrol people outside CourseLit, for example from a CRM, a payment system you run yourself, or an onboarding script, and want the person to appear in the school with access to a product.

Access in CourseLit is a **learner membership**, one relationship between a learner and a product or community. Granting access creates a membership. Removing access ends it.

You need an API key with the `contacts:write` permission to grant access, and `products:read` to look at customers. Removing access needs `products:write`. The product must be published.

## Grant access

Send the product ID and the person's email address. `name` is optional and is used when a learner account has to be created. It defaults to `Learner`.

```bash
curl -X POST "$COURSELIT_API_URL/v1/memberships" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prd_0190c0de0000700080000000000000a1",
    "email": "maria@example.com",
    "name": "Maria Silva"
  }'
```

The response is `201` with the membership.

```json
{
  "id": "lrm_0190c0de0000700080000000000000a3",
  "schoolId": "sch_0190c0de0000700080000000000000a0",
  "entityType": "product",
  "entityId": "prd_0190c0de0000700080000000000000a1",
  "paymentPlanId": null,
  "status": "active",
  "role": null,
  "subscriptionId": null,
  "subscriptionMethod": null,
  "joiningReason": "",
  "rejectionReason": null,
  "isIncludedInPlan": false
}
```

What the call does.

- If the email address has no learner account in this school, CourseLit creates one. The person can then sign in on the school website with their email address and a code, and see the product.
- If the person already has access, the call succeeds again and returns the existing membership. It never creates a second one.
- The learner gets an email telling them they have access, but only the first time access is granted.
- The membership has no payment plan and nothing is charged. It is a free grant.

If the product does not exist in the school or is still a draft, the call fails with `404` and the code `not_found`. Publish it first, see [Create and publish a course](/docs/developers/create-and-publish-a-course).

## Check who has access

List a product's customers. Use `q` to find one person by email or name.

```bash
curl "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/customers?q=maria@example.com" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

Each item has an `id` that identifies the customer in later calls, the `membershipId`, the `membershipStatus`, and a `progress` object. See [Report learner progress](/docs/developers/report-learner-progress).

## Remove access

Take a customer's access away with the customer `id` from the list. The membership ends immediately, and any subscription is cancelled.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/customers/$CUSTOMER_ID/remove-access" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "customerId": "sca_0190c0de0000700080000000000000a4",
  "membershipStatus": "expired",
  "subscription": null
}
```

To stop a subscription from renewing while keeping access until the end of the billing period, use the cancel-subscription operation for the same customer instead.

## Membership statuses

| `status` | Meaning |
| --- | --- |
| `active` | The learner has access |
| `pending` | Waiting for approval or payment |
| `payment_failed` | A payment did not go through |
| `paused` | Access is paused |
| `expired` | Access ended, for example because it was removed |
| `rejected` | A request to join was declined |

## With an AI assistant

The same operation is the MCP tool `grant_learner_membership`. It is a tool that needs confirmation, so the assistant must pass `confirm: true`, which it should do only after asking you. Removing access is `remove_product_customer_access`.
