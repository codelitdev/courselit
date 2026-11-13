---
title: Build a course with an assistant
description: Connect an AI assistant to your school and have it create a course, add its outline and pricing, and publish it.
nav_order: 150
---

An assistant connected to the [MCP server](/docs/developers/mcp-server) can do the work of [Create and publish a course](/docs/developers/create-and-publish-a-course) from a short conversation.

Before you start, connect an assistant under **Settings**, **AI assistants**, and select the school you want it to work on in the admin.

## A typical conversation

You might ask:

> Create a draft course called "Intro to watercolor" with three sections: Getting started, Basic techniques and Your first painting. Give each section two lessons with a short written introduction. Add a free plan.

The assistant then calls tools such as these, in order.

| Step | Tool | What it does |
| --- | --- | --- |
| 1 | `create_product` | Creates the course as a draft and returns its `id` |
| 2 | `apply_course_outline` | Adds all sections and their text lessons in one call, with Markdown lesson bodies |
| 3 | `create_plan` | Adds a plan, which a product needs before it can go live |
| 4 | `get_product` | Reads the course back so the assistant can check the result |

Review the course in the admin under **Products**. Everything the assistant created is a draft, so nothing is visible to learners yet.

## Publish it

When you are happy, ask the assistant to publish. It calls `update_product` with the status `published`. The call fails with `payment_plan_required` if the course has no active plan, and the assistant should add one and try again.

Publishing a product is an ordinary write tool, so it does not ask you for explicit confirmation the way deleting or publishing website pages does. Ask the assistant to wait for your go-ahead before it publishes.

## Tips

- Name the school and the course in your request, so the assistant uses the right ones.
- For video, audio, PDF and quiz lessons, tell the assistant to use `create_lesson`. `apply_course_outline` creates text lessons only. Media files must already be in the media library, because assistants cannot upload files.
- If a call times out, ask the assistant to run the outline again. `apply_course_outline` skips sections and lessons that already exist, so it does not create duplicates.
- Give the connection only the permissions it needs. A connection that can write products does not need to send email or change payment settings. See [Permissions and scopes](/docs/developers/permissions-and-scopes).
