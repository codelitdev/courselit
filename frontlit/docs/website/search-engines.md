---
title: Search engines and AI crawlers
description: Control whether search engines and AI crawlers can visit your website, and see the robots.txt and sitemap your site publishes.
nav_order: 85
---

Your website tells search engines and AI tools what they may visit through two files that CourseLit publishes for you:

- `/robots.txt` lists the rules each crawler should follow.
- `/sitemap.xml` lists the public pages of your site so search engines find them quickly.

You control the rules from **Website** then **Settings**, on the **Search engines** tab.

## The settings

| Setting | Default | What it does |
| --- | --- | --- |
| **Hide from search engines** | Off | Asks every crawler, search engines included, to stay away. Your sitemap is left empty. Use it while you get your site ready, then turn it off when you launch. |
| **Block AI training crawlers** | On | Asks the crawlers that collect content to train AI models to stay away: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent, Bytespider and cohere-training-data-crawler. |

AI search tools stay allowed either way, unless you hide your site. Crawlers such as OAI-SearchBot (ChatGPT search), Claude-SearchBot and PerplexityBot fetch pages to answer people's questions and link back to you, so your courses can show up and be cited in AI answers. Blocking Google-Extended and Applebot-Extended doesn't affect Google or Apple search.

Each setting saves as soon as you tick or untick it. Your `robots.txt` and sitemap can take about a minute to show the change. See [How quickly changes appear](/docs/website#how-quickly-changes-appear).

`robots.txt` is a request, not a lock. Well-known search engines and AI companies follow it, but it can't stop a crawler that ignores it.

## What's in your sitemap

Your sitemap lists:

- Your homepage and every other published page.
- Your published public courses and downloads, and your live communities, at their sales page addresses.
- Your published blog posts, plus the **Products** and **Blog** pages when there's something on them.

It leaves out drafts, unlisted products, and any page whose **Search engine visibility** is off in its [SEO settings](/docs/website/page-editor#set-seo-details). Learner-only areas such as the dashboard and checkout are never crawled.

When you [connect your own domain](/docs/website/custom-domain), `robots.txt` and the sitemap use it for every address.

## Who can change these settings

You need the `school:write` permission. See [Permissions](/docs/settings/permissions).
