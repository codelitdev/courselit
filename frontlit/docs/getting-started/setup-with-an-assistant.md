---
title: Set up your first offer with an AI assistant
description: Paste one line into Claude, ChatGPT or another AI assistant, and it interviews you and builds your first course, download or community in CourseLit.
slug: setup
nav_title: Set up with an AI assistant
nav_order: 45
---

You can set up your first offer by chatting with the AI assistant you already use, such as Claude, ChatGPT or Cursor. The assistant asks you a few questions about who you help and what you teach, suggests an offer, and builds it in your school once you agree.

Copy this into your assistant:

```text
Set up my first offer in CourseLit. Follow https://courselit.app/docs/setup.md
```

## What to expect

- **You need a CourseLit school.** If you don't have one yet, the assistant sends you to sign up first. See [Create your school](/docs/getting-started/create-a-school).
- **The assistant connects to your school.** It walks you through adding CourseLit to your assistant and signing in. See [Connect an AI assistant](/docs/settings/ai-assistants).
- **Nothing goes live without your go-ahead.** Everything is created as a draft. The assistant shows you what it made and asks before it publishes anything.
- **Never share passwords, sign-in codes or payment keys in the chat.** You sign in to CourseLit on CourseLit's own page, and you connect payments in your dashboard. The assistant never needs these.
- **You can stop at any time.** Anything already created stays as a draft in your dashboard, where you can finish it yourself.

If you prefer to do it by hand, follow the [Quickstart](/docs/getting-started/quickstart) instead.

## Instructions for AI assistants

This section is for the AI assistant. The person you're helping teaches, coaches or creates, and may not be technical. Use plain words, ask one or two questions at a time, and don't mention tool names, IDs or JSON unless they ask.

### Ground rules

- Never ask for a password, a sign-in code, an API key or payment provider keys. If the person pastes one, tell them not to share it and don't use it.
- Create everything as a draft. Publish only after the person clearly says yes to publishing.
- Show your plan before you build, and wait for approval.
- Before any tool that asks for `confirm: true`, explain what it will do and ask first.
- Do only what this page describes. If the person asks for more, such as sending emails, help them after the offer is done.

### Step 1: Make sure they have a school

Ask whether they already have a CourseLit school.

If they don't, send them to https://courselit.app to sign up. Signing up starts a short setup wizard. They only need to name their school and choose its currency. At the "Choose your first offer" step they can select **I'll decide later**, because you'll build the offer together. Wait for them to come back.

### Step 2: Connect to their school

Check whether you have CourseLit tools, such as `get_school_overview`, `create_product` and `list_school_hosts`.

If you don't, help them connect. The CourseLit address is `https://api.courselit.app/mcp`. It is also shown in their dashboard under **Settings**, **AI assistants**.

| Assistant | How to connect |
| --- | --- |
| Claude | **Settings**, **Connectors**, add a custom connector, paste the address, then sign in with CourseLit and choose the school |
| ChatGPT | **Settings**, **Connectors**, add a new connector, paste the address, then sign in with CourseLit and choose the school |
| Cursor | **Settings**, **MCP**, add a new server with the address as the server URL, then sign in when the browser opens |
| Other apps | Add a remote MCP server with the address, then sign in with CourseLit |

Adding a connector may need a new chat or a reload before the tools show up. If so, tell the person to paste the same line into the new chat. You'll start again from this page.

If their app can't connect to a remote MCP server, say so plainly. Offer to do the interview anyway and write the offer out, so they can enter it in the dashboard by following [Create a product](/docs/products/create-a-product).

Once connected, call `get_school_overview` to check the connection works. You act on the school they chose when they signed in, so ask them to confirm its name before you go on. If they have more than one school and picked the wrong one, they can disconnect and connect again from **Settings**, **AI assistants**.

### Step 3: Interview them

Learn enough to suggest one good first offer. Ask, a little at a time:

1. Who do you help? Be specific, for example "new managers in tech" rather than "everyone".
2. What do they want, or what problem do they have?
3. What result can you honestly help them get?
4. What do you already have? Notes, videos, a workbook, years of experience?
5. Do you want to charge for it, or give it away to grow your audience?

Then suggest one of these, and say why it fits:

| Offer | Good when |
| --- | --- |
| A course | They can teach a result step by step |
| A download | They have a guide, template or checklist. A free download works well as a lead magnet to collect email addresses |
| A community | They want an ongoing group, with members talking to each other and to them |

### Step 4: Show the plan

Write a short plan in plain words and ask for approval:

- The title and a two or three sentence description, written for the people they help.
- For a course, an outline of 3 to 5 sections with 2 to 4 lessons each, plus a short first draft of each lesson.
- For a download, what's in it and which files they will upload.
- For a community, who can join, and the question to ask applicants if joining is by request.
- The price. Free, one payment, a monthly or yearly subscription, or a payment plan in instalments. Prices are in the school's currency, which is set when the school is created.
- A cover image idea.

Change the plan until they're happy. Don't build anything until they say go.

### Step 5: Build it

Build the approved plan. Everything stays a draft.

**A course**

1. `create_product` with `kind: "course"`, the title and the description.
2. `apply_course_outline` with the sections and lessons. Lesson bodies are Markdown, without raw HTML. It's safe to call again if it times out, because it skips what already exists.
3. `search_unsplash` for a cover image. Show them two or three choices, then set the one they pick with `update_product` as `featuredImage`, using the image URL.
4. `create_plan` with a `name`, a `kind` and the price as `amountMinor`. Amounts are in minor units, so 49.00 is `amountMinor: 4900`. `kind` is `free` (with `amountMinor: 0`), `one_time`, `subscription` (also set `billingInterval` to `month` or `year`) or `installment` (also set `installmentCount`).

**A download**

1. `create_product` with `kind: "download"`. For a free download that collects email addresses, set `leadMagnet: true`, which also creates its free plan.
2. You can't upload files. Ask them to upload the files to the download in their dashboard under **Products**, and point them to [Digital downloads](/docs/products/digital-downloads).
3. Set a cover image as for a course.
4. For a paid download, `create_plan` as for a course.

**A community**

Each school has one community, created along with the school.

1. `get_school_community` to read it.
2. `update_community` with the name, the description, and `autoAcceptMembers` plus `joiningReasonText` if joining is by request. Leave `enabled` alone for now.
3. `create_community_plan` with the same fields as `create_plan`.

### Step 6: Check payments for a paid offer

If the offer costs money, call `get_school_payment_settings`.

If no payment provider is connected, tell them people can't pay until it is. They connect it themselves in the dashboard under **Settings**, **Payments**. See [Payments](/docs/settings/payments). Don't ask for their payment keys and don't call `update_school_payment_settings`.

### Step 7: Review and publish

Ask them to look over the draft in their dashboard, under **Products** for a course or download, or **Community** for a community. Fix anything they want changed.

When they clearly say to publish:

- For a course or download, call `update_product` with `status: "published"`. If it fails with `payment_plan_required`, the offer has no plan yet. Add one and try again.
- For a community, call `update_community` with `enabled: true`.

For a paid offer without payments connected, suggest waiting to publish until payments are set up.

### Step 8: Wrap up

Tell them what was built and where to find it. In the dashboard, **View sales page** on the product, or **Copy sales page link** on the community, gives them the link to share.

Then suggest two or three next steps, without doing them unless asked:

- Finish the [setup checklist](/docs/getting-started/setup-checklist), including the mailing address that email needs.
- Make the site look like theirs with a logo and theme. See [Branding and themes](/docs/website/branding-and-themes).
- [Invite their first learners](/docs/learners/invite-learners).

### When something goes wrong

| What you see | What to do |
| --- | --- |
| A tool returns `forbidden` with `details.confirmation` set to `required` | It needs `confirm: true`. Ask the person first, then call it again |
| A tool returns `forbidden` for another reason | Their account can't do that in this school. Tell them, and suggest they ask the school owner |
| `validation_failed` with `unsupported_markdown` | Remove raw HTML from the lesson and try again |
| CourseLit tools disappear or fail to sign in | Ask them to reconnect under **Settings**, **AI assistants** in the dashboard |

For every tool, see [MCP tools](/docs/developers/mcp-tools).
