---
title: MCP tools
description: Understand how CourseLit MCP tools are named, which ones need confirmation, and which areas of the school they cover.
nav_order: 100
---

CourseLit has one MCP tool for each operation of the REST API that an API key or an OAuth token can call. There are no generic "call any endpoint" tools. Each tool has a name, a description and a typed input, so assistants such as ChatGPT can choose and call it directly.

## Naming rule

A tool is named after its REST operation in `snake_case`. The operation `listSections` is the tool `list_sections`, and `grantLearnerMembership` is `grant_learner_membership`. Names start with a verb that tells you what the tool does.

| Prefix | What the tool does |
| --- | --- |
| `list_` | Reads a collection |
| `get_` | Reads one item |
| `create_` | Creates something |
| `update_` | Changes something |
| `delete_` | Deletes something permanently |

Other verbs follow the same idea, for example `publish_school_website_page`, `archive_plan` and `reorder_lessons`.

Ask the server for `tools/list` to see every tool with its description and input schema. The assistant normally does this for you. The list is the same for every credential, and a call the credential is not allowed to make is refused when you run it.

## Tool input

A tool takes one flat object. The path parameters, query parameters and body fields of the REST operation are all fields of that object, under the same names. For the REST call `POST /v1/products/{productId}/sections` with a body of `title`, the tool is `create_section`.

```json
{
  "productId": "prd_0190c0de0000700080000000000000a1",
  "title": "Getting started"
}
```

The input is validated twice, against the tool's schema and then against the REST contract, so the same rules and limits apply as over REST.

## Confirmation for destructive actions

Reading tools are marked read-only. Tools that delete data, or that are hard to undo, are marked destructive and have an extra `confirm` field. The call is refused unless `confirm` is `true`, and the assistant is expected to ask you first.

```json
{
  "sectionId": "sec_0190c0de0000700080000000000000a2",
  "confirm": true
}
```

Without it, the tool returns an error with the code `forbidden` and `details.confirmation` set to `required`.

These tools need `confirm: true`.

- Every `delete_` tool.
- Granting learner access, `grant_learner_membership`, removing a customer's access, `remove_product_customer_access`, and cancelling a customer's subscription, `cancel_product_customer_subscription`.
- Archiving a plan, `archive_plan` and `archive_community_plan`.
- Publishing or unpublishing website content, and discarding drafts: `publish_school_website_page`, `publish_school_website_blog`, `unpublish_school_website_blog`, `discard_school_website_page` and `discard_school_website_blog`.
- Emailing contacts, `start_mail_sequence`.
- Renaming a contact tag, `rename_contact_tag`.
- Changing custom code or payment settings, `update_school_code_injection` and `update_school_payment_settings`.

## Credentials and permissions

A tool runs through the same checks as its REST operation. If the credential cannot call the operation, the tool returns `forbidden`. For example, `start_mail_sequence` and `update_school_payment_settings` work with an OAuth sign-in but not with an API key. See [Permissions and scopes](/docs/developers/permissions-and-scopes).

## Tools by area

This is a summary, not a full list. The assistant sees every tool with its description.

| Area | Examples |
| --- | --- |
| Products and courses | `list_products`, `get_product`, `create_product`, `update_product`, `delete_product` |
| Sections and lessons | `list_sections`, `create_section`, `update_section`, `reorder_sections`, `create_lesson`, `update_lesson`, `reorder_lessons`, `delete_lesson` |
| Payment plans | `list_plans`, `create_plan`, `update_plan`, `set_default_plan`, `archive_plan` |
| Customers and progress | `list_product_customers`, `get_product_customer_progress`, `get_product_analytics`, `remove_product_customer_access` |
| Learner access | `grant_learner_membership` |
| Contacts and segments | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `update_contact_marketing`, `list_contact_segments`, `create_contact_segment`, `list_contact_tags` |
| Email | `list_mail_sequences`, `create_mail_sequence`, `create_mail_sequence_email`, `list_mail_templates`, `start_mail_sequence` |
| Communities | `list_communities`, `create_community`, `list_community_members`, `list_community_posts`, `create_community_plan`, `list_spaces`, `create_space` |
| School website | `list_school_website_pages`, `update_school_website_page`, `publish_school_website_page`, `list_school_website_blogs`, `update_school_website_branding` |
| Media | `list_media`, `get_media`, `update_media`, `list_media_references`, `search_unsplash`, `delete_media` |
| Certificates | `list_certificate_templates`, `create_certificate_template`, `upsert_product_certificate_template` |
| School | `get_school_overview`, `update_school`, `list_school_hosts`, `create_school_host` |

Operations that make no sense for an assistant are not tools. These include everything a learner does in the browser, public website endpoints, health checks, file upload authorization, account-level school and billing operations, API key management and team administration.

## The course outline tool

One tool is not a single REST operation. `apply_course_outline` adds sections and text lessons to a course or download in one call, in the order you give.

```json
{
  "productId": "prd_0190c0de0000700080000000000000a1",
  "sections": [
    {
      "title": "Getting started",
      "lessons": [
        { "title": "Welcome", "markdown": "# Welcome\n\nIn this course you will paint **three** landscapes." },
        { "title": "Your materials", "markdown": "You need paper, paint and two brushes.", "status": "published" }
      ]
    }
  ]
}
```

- Lesson bodies are Markdown, with headings, emphasis, lists, links, code blocks and tables. Raw HTML is not allowed and fails with `validation_failed` and `details.reason` set to `unsupported_markdown`.
- New lessons are drafts unless you set `status` to `published`. The product's own status does not change.
- A section or lesson whose title already exists in the same place, compared without regard to case, is kept as it is and not duplicated. The call is safe to retry or to extend later.
- It takes up to 50 sections and up to 100 lessons per section.
- It creates text lessons only. For video, audio, PDF, file, embed, quiz and SCORM lessons, use `create_lesson`.

The response lists the product, how many sections and lessons were created, and each section with its lessons and whether each one was created or already existed.

## Differences from REST

The tools for products, media and contacts that were written by hand take a smaller input than the REST operations. For example, `list_products` takes no input and `list_media` has no `category` filter. Use REST when you need every parameter.
