---
title: Community plans
description: Create free, one-time, subscription and installment plans for your community, choose which plan is shown first and archive old plans.
nav_order: 40
---

A plan is a way to join your community. You can offer one plan or several at the same time, and learners pick one on your sales page and at checkout. A community needs at least one active plan, and one of them starred, before it can go live.

Plans are managed in the **Plans** card on the **Details** tab, and in the setup screen when you first go live. You need the `communities:write` permission.

## Plan types

| Type | What the member pays |
| --- | --- |
| Free | Nothing. |
| One time | A single payment. |
| Subscription | A recurring payment, monthly or yearly, until they cancel or leave. |
| EMI / installments | A fixed number of monthly payments, from 2 to 60. |

Paid plans are only available once a payment provider is connected. Until then, the paid types are disabled in the dialog, with the hint "Configure a payment method in School settings to enable paid plans." See [Settings](/docs/settings). The currency of every plan is your school's currency, which is set in your school settings.

## Add a plan

1. In the **Plans** card, click **Add a plan**. The card says "Free, one time, subscription or EMI".
2. In the **New payment plan** dialog, fill in:

   | Field | Notes |
   | --- | --- |
   | Name | Required. Shown to learners at checkout, for example "Full course access". |
   | Description | Optional text shown to learners at checkout. |
   | Payment type | **Free**, **One time**, **Subscription** or **EMI / installments**. |
   | One-time Amount | For **One time**. Must be above zero. |
   | Subscription Type and Monthly Amount or Yearly Amount | For **Subscription**. Choose **Monthly** or **Yearly**, then the amount. |
   | Monthly Payments | For **EMI / installments**. Enter the number of payments (2 to 60) and the amount of each. The dialog shows the **Total**. |
   | Included Products | Optional. Courses and downloads that members get with this plan. See [Grant access to additional products](/docs/communities/included-products). |

3. Click **Save**.

The first plan you add is starred automatically. Prices must fit the currency, for example whole numbers for currencies without decimals.

## Choose which plan is shown first

Click the star on a plan to show it first on the sales page. A **Shown first** badge appears when you have more than one active plan. Only one plan is starred at a time.

## Edit a plan

Click a plan's name to open it in the same dialog and change its details.

## Archive a plan

Click the archive button on a plan. In the **Archive this payment plan?** dialog, confirm **Archive** in the dialog. An archived plan is no longer offered to new people. Members already on the plan keep their access and their price.

<Callout type="warning" title="Things to know before archiving">

- Archiving cannot be undone.
- The starred plan cannot be archived. Star another plan first.

</Callout>

## Plans and approval

A plan decides how people pay. Whether they get in straight away or wait for your approval is a community setting, **Who gets in**, see [Community details](/docs/communities/details):

- A free plan on a community that requires approval creates a request that waits for you.
- A paid plan activates the membership when the payment is confirmed.

Learners see the full flow in [Checkout and purchases](/docs/learners/purchases).
