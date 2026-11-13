---
title: Errors
description: Read CourseLit API error responses, understand each error code and its HTTP status, and handle the most common failures.
nav_order: 50
---

When a request fails, the API returns a non-2xx HTTP status and a JSON body in one fixed shape.

```json
{
  "code": "validation_failed",
  "message": "The request is invalid.",
  "details": {
    "reason": "payment_plan_required"
  }
}
```

| Field | Meaning |
| --- | --- |
| `code` | A stable, machine-readable error code. Branch on this, not on the message. |
| `message` | A fixed human-readable sentence for the code. It does not carry request-specific data. |
| `details` | Optional. A flat object of strings, numbers, booleans and nulls. Most often it holds a `reason` that says which rule failed. |

## Error codes

| `code` | HTTP status | Meaning |
| --- | --- | --- |
| `unauthenticated` | 401 | No credential was sent, or it is malformed, unknown, revoked or expired. |
| `credential_ambiguous` | 400 | More than one credential was sent. Send exactly one. |
| `tenant_required` | 400 | An OAuth request did not name a school and the person has not selected one. |
| `tenant_forbidden` | 403 | The person is not a member of the school named in `X-School-ID`, or the school does not exist. |
| `forbidden` | 403 | The credential lacks the permission, or is not allowed on this operation, or the action is otherwise not permitted. |
| `not_found` | 404 | The resource does not exist in this school. A resource that belongs to another school also returns this. |
| `conflict` | 409 | The request conflicts with current state, such as a slug that is already taken. |
| `validation_failed` | 400 | The request body, query or a business rule is invalid. |
| `rate_limited` | 429 | Too many requests. See [Rate limits and retries](/docs/developers/rate-limits-and-retries). |
| `internal_error` | 500 | Something went wrong on the server. Retry later, and report it with the request ID. |

## Common `details.reason` values

A few reasons you are likely to meet while following the guides.

| `reason` | Status and code | When it happens |
| --- | --- | --- |
| `payment_plan_required` | 400 `validation_failed` | You tried to publish a product that has no active payment plan and is not included with a community. See [Create and publish a course](/docs/developers/create-and-publish-a-course). |
| `slug_taken` | 409 `conflict` | The slug is used by another product or page in the school. |
| `invalid_slug` | 400 `validation_failed` | The slug contains nothing usable after it was cleaned up. |
| `duplicate_payment_plan` | 409 `conflict` | The product already has an active plan of this type. A product can have one active free, one-time and installment plan, and one monthly and one yearly subscription. |
| `invalid_plan_shape` | 400 `validation_failed` | The plan fields do not fit its type, for example an amount on a free plan. |
| `api_key_limit_reached` | 409 `conflict` | The school already has 50 active API keys. |
| `credential_not_allowed` | 403 `forbidden` | The operation does not accept this kind of credential, for example an API key on payment settings. |
| `lesson_locked` | 403 `forbidden` | A learner tried to complete a lesson that is still locked by a drip schedule. `details.availableAt` says when it opens. |
| `confirmation` set to `required` | 403 `forbidden` | An MCP tool needs `confirm: true`. See [MCP tools](/docs/developers/mcp-tools). |

Treat `reason` values as hints for people and logs. New reasons can appear, so handle unknown ones by falling back to the `code`.

## Validation errors

Bodies that do not match the operation's schema return `400` with the code `validation_failed`. The response does not list individual fields. Check the request against the operation in the API reference. Malformed JSON and bodies larger than 32 KB are also rejected.

## Request IDs

Every response carries an `X-Request-ID` header. If you send your own `X-Request-ID` request header, up to 128 characters, the API uses it, otherwise it generates one. Log the value, and include it when you contact support about an error.

## Handling errors in code

- Retry `429` and `5xx` responses with exponential backoff, and honor `Retry-After` when present.
- Do not retry other `4xx` responses without changing the request.
- On `401`, stop and check the key rather than retrying, because repeated failures from one address are throttled.
