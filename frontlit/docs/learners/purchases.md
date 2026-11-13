---
title: Checkout and purchases
description: Understand how learners buy or join, what receipts and order history they get, and how subscriptions, refunds and cancellations behave.
nav_order: 110
---

This page explains the buying journey from the learner's side, so that you can support your customers. To set prices, see [Products](/docs/products) for courses and downloads, and [Community plans](/docs/communities/plans) for your community. To connect a payment provider, see [Settings](/docs/settings).

## Checkout

A learner starts checkout from a product page with **Buy now**, or from your community's page with **Join community**. They land on a **Checkout** page with:

- **Personal Information**: the signed-in learner's email and name. A learner who is not signed in uses the same sign-in form described in [Learner sign-in](/docs/learners/sign-in), so they can sign in without leaving checkout.
- **Select Your Plan**: each plan with its name, description, price and the products it includes.
- A question for the learner, only on free community plans where you approve members yourself.
- An **Order summary** with the item, the plan and the **Total**.

The button at the bottom depends on the plan:

| Situation | Button |
| --- | --- |
| A paid plan | **Complete Purchase** |
| A free course or download | **Get for free** |
| A free community plan that lets everyone in | **Join for free** |
| A free community plan that needs your approval | **Request to join** |

If you published a Terms page, the page says that by submitting the learner accepts the Terms.

A learner who already has access sees "You already have access" with a button to open the course, download or community instead, so nobody is charged twice. A learner whose community request was rejected sees "You have been rejected and cannot proceed with checkout."

### After paying

The page shows **Thank you for your purchase!** and confirms "Payment verified successfully. Your access is ready." once the payment provider confirms it. Until then it says the payment has not been received yet and offers **Check status again**. Other outcomes are shown as well: verification failed, payment cancelled, payment refunded, or under review.

<Callout type="note" title="Payments need a connected provider">

Paid plans can only be created and sold when your school has a payment provider configured. If a provider refuses a checkout, the learner sees "This school can't take payments right now. We've let the school know." and your team is notified.

</Callout>

## Emails and notifications

- The learner gets a receipt email for each payment, with the item, amount, date and order number. Free plans get a confirmation email instead. Renewals of subscriptions get a "Payment received" email.
- You and team members who manage the product or community get a **New sale** notification in the admin.

## Purchases page

Learners open **Purchases** from the menu at the bottom of the dashboard sidebar. The page is called **Purchases**, with the line "Everything you have bought from this school, with order numbers for your records." Each purchase is a card with:

- The title, the plan name and the plan type: **Free**, **One-time payment**, **Subscription** or **Installments**.
- The date and the **Order** number.
- The amount, and how much was refunded for partly refunded orders.
- A status: **Paid**, **Refunded**, **Disputed**, **Failed** or **Partly refunded**.
- A button to **Open course**, **Open download** or **Go to the community**, shown for paid purchases.
- **Manage subscription** or **Manage membership** for paid subscriptions.

The order number is the reference your learners can quote when they contact you. A learner with no purchases sees "No purchases yet" and a **Browse products** button.

## Subscriptions and installments

| Plan | What the learner can do |
| --- | --- |
| Subscription to a product | On **Products**, the card shows "Subscription active, renews on" and a date. **Cancel subscription** stops future charges and keeps access until the end of the paid period, then access ends. |
| Installments | The card shows how many installments are paid, for example "2 of 6 installments paid". Installment plans cannot be cancelled by the learner. Remaining installments are charged automatically, and once all are paid the learner has lifetime access. |
| Community subscription | Leaving the community cancels the billing and ends access right away. See [What members see](/docs/communities/member-experience). |

You can also cancel a customer's subscription yourself, or remove access, from the product's [Customers](/docs/learners/product-customers) screen.

## Refunds and failed payments

Refunds are made with your payment provider, not in CourseLit. CourseLit learns about them from the provider and updates the learner's account:

- A full refund or a dispute marks the purchase **Refunded** or **Disputed** and ends access. The membership becomes **Expired**.
- A partial refund keeps access and shows the refunded amount on the purchase.
- A failed recurring payment sets the membership to **Payment failed**, and the learner has no access until a payment succeeds.

See [Membership statuses](/docs/learners/membership-status).
