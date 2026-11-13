---
title: Payment plans
description: Add free, one-time, subscription or instalment plans to a product and choose which plan learners see first.
nav_order: 90
---

A **payment plan** tells learners how they can get a product. A product can have several plans, and learners pick one at checkout. A product needs at least one active plan before it can [go live](/docs/products/publish-and-visibility).

You manage plans on the product's **Settings** tab, in the **Payment plans** card. On a draft product, the card is marked **Needed to go live**.

## Plan types

| Payment type | What the learner pays |
| --- | --- |
| Free | Nothing. The learner gets access straight away. |
| One time | A single payment. |
| Subscription | A recurring payment, **Monthly** or **Yearly**. |
| EMI / installments | A fixed number of monthly payments, from 2 to 60. |

Prices use your school's currency, which you set when you created the school. The plan dialog reminds you that currency is managed centrally in the school settings. Amounts must be greater than zero, and use as many decimal places as the currency allows.

## Before you add a paid plan

Free plans work without any setup. To add a **One time**, **Subscription** or **EMI / installments** plan, you first need to connect a payment provider for your school. Until then, those options are disabled and the dialog says "Configure a payment method in School settings to enable paid plans." On a product that has a paid plan but no connected provider, the **Payment plans** card shows **Connect payments to charge for paid plans** with a **Payment settings** button. See [Settings](/docs/settings) for payment setup.

Learner payments go to your own payment account, not through CourseLit.

## Add a plan

<Steps>

<Step>

### Open the plan dialog

On the **Settings** tab, in **Payment plans**, select **Add a plan**. The dialog **New payment plan** opens.

</Step>

<Step>

### Name the plan

Enter a **Name** and an optional **Description**. Both are shown to learners at checkout.

</Step>

<Step>

### Choose the pricing

Pick a **Payment type** and fill in the amount.

- **One time**: enter the **One-time Amount**.
- **Subscription**: pick a **Subscription Type** (**Monthly** or **Yearly**) and enter the amount.
- **EMI / installments**: enter the number of payments and the amount of each one. The dialog shows the **Total**.

</Step>

<Step>

### Save

Select **Save**. The plan appears in the list with its price and type.

</Step>

</Steps>

If the same payment type and frequency already exists on the product, you see "A payment plan with this type and frequency already exists."

## Choose the plan shown first

When a product has more than one plan, the starred plan is shown first on the sales page. Select the star next to a plan to make it the default. The plan carries a **Shown first** badge.

## Edit or archive a plan

Select a plan's name to edit it. To retire a plan, select the archive icon and confirm **Archive**. Archiving a plan stops it being offered to new learners, but people already on it keep access. Archiving cannot be undone.

You cannot archive the default plan. Make another plan the default first. Archived plans are not shown in the list, and a plan is never deleted so your payment history stays intact.

## What learners see

On the sales page, learners see the price of the plan shown first, and a button: **Start learning for free** for a free plan, or **Buy now** for a paid one. When there are several plans, they can switch between them by name before they continue to checkout.

## Plans and other features

- A **lead magnet** needs exactly one plan, and it must be free. See [Lead magnets](/docs/products/lead-magnets).
- A community plan can include courses, so members receive them automatically. Product plans cannot include other products. See [Communities](/docs/communities).
