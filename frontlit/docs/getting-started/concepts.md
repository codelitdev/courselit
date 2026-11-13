---
title: Core concepts
description: Understand schools, teams, products, lessons, learners, memberships and communities before you start building.
nav_order: 20
---

CourseLit uses a small set of ideas. Knowing what each one means makes the rest of the documentation easier to follow.

## School

A **school** is your business on CourseLit. Each school has its own:

- public website, with a homepage and Terms and Privacy pages
- products, learners and community
- branding, payment settings and email setup

One account can belong to several schools. Use the school switcher at the top of the admin sidebar to move between them, and choose **Add school** to create another.

## Team

The person who creates a school is its **owner**. Owners can invite other people to the **team**, and each team member gets only the permissions you give them, such as managing products or editing the website. See [Settings](/docs/settings) for team and permission options.

## Products

A **product** is something you offer. CourseLit has two kinds, and you choose one when you create the product. You cannot change it afterwards.

| Kind | What it is |
| --- | --- |
| Course | Lessons that people work through at their own pace, grouped into sections. |
| Digital download | One or more files that people get straight away. A free download can act as a lead magnet. |

Every product starts as a **draft**. Nobody can see a draft; you make it live when it is ready. Every product also gets its own **sales page** on your site, which you can edit in the page editor. Read more in [Products](/docs/products).

## Sections and lessons

A course is organised into **sections**, like chapters or weeks. Each section holds **lessons**. A lesson has a type: Text, Video, Audio, PDF, File, Embed, Quiz or SCORM.

Each lesson is either **Live** or **Draft**. Learners only see live lessons, and only once the course itself is live. You can also release a whole section later with a **drip schedule**. See [Sections and lessons](/docs/products/sections-and-lessons).

A digital download works the same way, except its lessons are **files** that learners download.

## Learners

A **learner** is someone who signs up on your school's website to buy, join or learn. Learners sign in with their email address and a code sent to them, and use your school's site rather than the admin dashboard. They also appear as contacts in your school. See [Learners](/docs/learners).

## Learner memberships

Access is modelled as a **learner membership**: one relationship between a learner and a product or your community. A membership records whether access is active, how the person got it (a free plan, a payment, an invitation or a community plan that includes the product) and how it is paid for.

When you give someone access to a course, or when a learner buys or joins for free, CourseLit creates a membership. When you remove access, the membership ends. Progress, quiz results, downloads and certificates all belong to a membership.

## Payment plans

A **payment plan** says how people get a product: **Free**, **One time**, **Subscription** or **EMI / installments**. A product can have several plans, and learners choose one at checkout. A product needs at least one active plan before it can go live. See [Payment plans](/docs/products/payment-plans).

## Communities

Each school has one **community**: a place with spaces, posts, comments and reactions for your members. People join instantly or by request, and a community plan can include courses that members receive automatically. Community setup lives under [Communities](/docs/communities).

## Admin and storefront

CourseLit has two sides.

| Side | Who uses it | What it is for |
| --- | --- | --- |
| Admin dashboard | You and your team | Creating products, managing learners, editing the website, sending email and changing settings. |
| Storefront | Your learners and visitors | Your school's public website: sales pages, checkout, the learner dashboard, the course viewer and the community. |

Your school's site lives at an address like `your-school.courselit.app`, and you can connect your own domain later.
