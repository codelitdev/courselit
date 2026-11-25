---
title: Move from CourseLit v0
description: CourseLit 1.0 moves from MongoDB to PostgreSQL. A guide to moving your school from CourseLit v0 is on the way.
nav_title: From CourseLit v0
nav_order: 10
---

CourseLit 1.0 is a rewrite. Among other changes, it stores your school in **PostgreSQL** instead of **MongoDB**, so a school can't be upgraded in place from CourseLit v0 (0.x).

We are working on a guide to moving your courses, downloads, community, learners and contacts from v0 to 1.0. This page will hold it.

<Callout type="info" title="Until the guide is ready">

- Keep running your school on CourseLit v0. The [v0 docs](/docs/legacy/introduction) still apply to it.
- If you self-host v0, don't point a 1.0 deployment at your existing MongoDB database. 1.0 needs its own PostgreSQL database.
- Questions? Ask in the [CourseLit community on Discord](https://discord.com/invite/GR4bQsN).

</Callout>
