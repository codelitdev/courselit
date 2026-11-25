---
title: Create and publish a course
description: Use the REST API to create a course, add a payment plan, sections and lessons, and make it live on the school website.
nav_order: 110
---

This guide builds a complete course with the API. You will create the product, give it a payment plan, add a section with lessons and publish it.

You need an API key with the `products:write` permission, which also includes `products:read`. The examples use these variables.

```bash
export COURSELIT_API_URL="https://api.courselit.app"
export COURSELIT_API_KEY="cl_live_key_..."
export PRODUCT_ID="prd_..."
```

Set `PRODUCT_ID` after step 1.

<Callout type="tip" title="Prefer an assistant?">

With the [MCP server](/docs/developers/mcp-server), an assistant does the same work with the tools `create_product`, `create_plan`, `apply_course_outline` and `update_product`. See [Build a course with an assistant](/docs/developers/build-a-course-with-an-assistant).

</Callout>

<Steps>

<Step>

### Create the product

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

The response is `201` with the product in the `draft` status. Copy its `id` into `PRODUCT_ID`. See [Make your first request](/docs/developers/first-request) for the full response.

</Step>

<Step>

### Add a payment plan

A product needs at least one active payment plan before it can be published, unless it is included with a community. Choose the type that fits.

<Tabs items={["Free", "One time", "Subscription", "Installments"]}>

<Tab value="Free">

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/plans" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Free access", "type": "free" }'
```

</Tab>

<Tab value="One time">

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/plans" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Lifetime access", "type": "onetime", "oneTimeAmount": 49 }'
```

</Tab>

<Tab value="Subscription">

Send either `subscriptionMonthlyAmount` or `subscriptionYearlyAmount`, not both. Create two plans to offer both intervals.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/plans" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Monthly", "type": "subscription", "subscriptionMonthlyAmount": 9 }'
```

</Tab>

<Tab value="Installments">

`emiTotalInstallments` is the number of payments, from 2 to 60.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/plans" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Pay in 3", "type": "emi", "emiAmount": 20, "emiTotalInstallments": 3 }'
```

</Tab>

</Tabs>

Amounts in `oneTimeAmount`, `emiAmount` and the subscription fields are in the school's currency, in major units, so `49` means 49.00. You can instead send `kind` and `amountMinor`, for example `"kind": "one_time"` and `"amountMinor": 4900`. The response reports the price as `amountMinor` and the school's `currency`.

The first active plan becomes the product's default plan. A product can have one active plan of each type, and one monthly and one yearly subscription. Choose another default with the set-default-plan operation, and retire a plan with the archive-plan operation.

Learners pay through the payment provider the school sets up in the admin. Payment settings cannot be changed with an API key.

</Step>

<Step>

### Add a section

Sections group lessons, like chapters or weeks.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/sections" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Getting started" }'
```

```json
{
  "id": "sec_0190c0de0000700080000000000000a2",
  "title": "Getting started",
  "position": 1,
  "dripEnabled": false,
  "dripType": null,
  "dripDelaySeconds": null,
  "dripAt": null
}
```

Copy the section `id`.

</Step>

<Step>

### Add lessons

Create a page lesson in the section. Send the page as Markdown in `markdown`; `type` defaults to `page`. A lesson created without a `status` is a `draft`. Send `"status": "published"` to make the lesson live right away.

```bash
curl -X POST "$COURSELIT_API_URL/v1/products/$PRODUCT_ID/lessons" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Welcome",
    "sectionId": "sec_0190c0de0000700080000000000000a2",
    "status": "published",
    "markdown": "Welcome to the course.\n\n<Video url=\"https://www.youtube.com/watch?v=aqz-KE-bpKQ\" />\n\n<Quiz passingGrade={70}>\n\n<Question text=\"Ready to start?\">\n\n<Option text=\"Yes\" correct />\n\n<Option text=\"Not yet\" />\n\n</Question>\n\n</Quiz>"
  }'
```

The response is `201` with the lesson, including its `id`, `position`, `status`, the page as `markdown` and as rich-text JSON in `content`, and a `contentVersion`. Leave quiz, question and option IDs out; the saved lesson returns them.

A page is Markdown (headings, emphasis, lists, links, code blocks and tables) with block tags for images, video, audio, PDF, files, embeds, callouts and at most one quiz. Read the `getLessonContentFormat` operation (`GET /v1/lesson-content-format`) for every tag, its props and an example; blocks your school can't add right now, such as Embed during the trial, are listed with the reason. You can send the page as rich-text JSON in `content` instead of `markdown`, but not both.

| `type` | What to send |
| --- | --- |
| `page` | `markdown`, or `content` as a rich-text document. Media blocks take the `id` of a file in the media library, such as `<Video media="med_…" />`. See [Upload media for a lesson](/docs/developers/upload-media-for-a-lesson). |
| `scorm` | `mediaId` of the uploaded package, then process it with the process-SCORM-package operation |

To change a page later, send `markdown` or `content` to the update-lesson operation with the `expectedContentVersion` you last read. Edits to an existing page are saved as a draft: learners see them after you call the publish-lesson-content operation (`POST /v1/lessons/:lessonId/publish-content`), or when the lesson is made live. A version that doesn't match fails with `conflict`, so two writers can't overwrite each other.

Other useful lesson fields are `requiresEnrollment`, which defaults to `true` (a page with a quiz can't set it to `false`), and the drip fields `dripDelaySeconds` and `dripAt` to unlock a lesson later. Use the reorder-lessons and reorder-sections operations to change the order.

</Step>

<Step>

### Publish the product

Set the status to `published`. You can also make the product visible in the school's catalog by setting `privacy` to `public`. A new product is `unlisted`, which keeps it reachable by its link but out of the catalog.

```bash
curl -X PATCH "$COURSELIT_API_URL/v1/products/$PRODUCT_ID" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "published", "privacy": "public" }'
```

If the product has no active payment plan, the call fails with `400`, the code `validation_failed` and `details.reason` set to `payment_plan_required`. Add a plan and try again.

Learners only see lessons that are published, and only once the product itself is published.

</Step>

<Step>

### Check the result

Read the product back with its sections and lessons.

```bash
curl "$COURSELIT_API_URL/v1/products/$PRODUCT_ID" \
  -H "x-api-key: $COURSELIT_API_KEY"
```

The response is the product with a `sections` array and a `lessons` array. The course is live. Its sales page was created together with the product.

</Step>

</Steps>

## Take a course offline

Set `status` back to `draft` with the same `PATCH` call. The product keeps its `publishedAt` date, so you can tell a product that is offline from one that was never live.

## Next steps

- [Grant a learner access](/docs/developers/grant-learner-access) to the course.
- [Report learner progress](/docs/developers/report-learner-progress) as people work through it.
