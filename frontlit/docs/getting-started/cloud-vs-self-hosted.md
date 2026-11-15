---
title: Cloud or self-hosted
description: Compare CourseLit's hosted cloud with running CourseLit on your own servers, and pick the one that suits your school.
nav_order: 15
---

You can use CourseLit in two ways. **CourseLit Cloud** at courselit.app is run for you. **Self-hosted CourseLit** is the same open-source software, running on servers you manage. Both have the same features and the same admin dashboard, and your learners can't tell them apart.

## Side by side

| | CourseLit Cloud | Self-hosted |
| --- | --- | --- |
| Price | Pro $29 a month or Business $79 a month, after a 14-day free trial | Free. You pay for your own servers and services |
| Features | Pro covers most schools. SCORM lessons, learner single sign-on and the audit log need Business | Every feature, with no licence key |
| Setup | Sign up and start building | Deploy the API, worker, admin and storefront yourself |
| Hosting and updates | Done for you | Done by you |
| Storage and email | Included, within your plan's limits | Connect your own media storage and email services |
| Fee on your sales | None | None |
| Support | Email on Pro, priority on Business | Community support on Discord |

On both, learners pay through your own Stripe, Lemon Squeezy or Razorpay account, and CourseLit takes no cut of your sales.

## Choose CourseLit Cloud if

- You want to teach and sell, not run servers.
- You want updates, backups and email delivery handled for you.
- You'd like to start today: create a school in a few minutes, with no card needed for the trial.

See [Plans and limits](/docs/getting-started/plans-and-limits) for what each plan includes, then [create your school](/docs/getting-started/create-a-school).

## Choose self-hosting if

- You need your data on your own infrastructure.
- You are comfortable running containers, PostgreSQL and a reverse proxy.
- You want every feature without a subscription.

<Callout type="warning" title="Self-hosting is for experienced operators today">

CourseLit 1.0 is in pre-release. There is no one-command installer, and details can change between pre-releases. Read [Self-hosting](/docs/self-hosting) before you start.

</Callout>

## Switching later

Your school's content is reachable through the [REST API](/docs/developers) on both, so you are not locked in to either choice. There is no one-click move between the cloud and a self-hosted deployment yet.
