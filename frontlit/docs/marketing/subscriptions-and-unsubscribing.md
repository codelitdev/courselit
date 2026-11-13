---
title: Subscriptions and unsubscribing
description: Understand who receives your marketing emails, how contacts opt in and out, and which emails are sent regardless.
nav_order: 90
---

Every contact has a marketing subscription: either **Subscribed** or **Unsubscribed**. Only subscribed contacts receive your broadcasts and sequences. This page explains how contacts become subscribed and how they leave.

## What the subscription controls

- Broadcasts go only to subscribed contacts who match the audience. A broadcast can't be sent if no subscribed contact matches.
- Sequences admit only subscribed contacts who match the audience and don't match the exclude filters.
- Unsubscribed contacts don't get broadcasts or sequences, but they still receive sign-in codes and receipts.

You can see each contact's state as a badge on the [Contacts](/docs/marketing/contacts) screen and filter by it with the **Subscription** filter.

## How contacts become subscribed

| How | Result |
| --- | --- |
| A visitor submits a **Newsletter signup** block on your site | They become a contact and are subscribed. |
| A learner turns on **Newsletter and marketing emails** in their account profile on your site | They are subscribed. |
| You turn on **Mailing subscription** on the contact's page | They are subscribed. |

Signing in or registering as a learner doesn't subscribe a contact by itself.

<Callout type="note" title="Only email people who agreed">

Subscribe a contact by hand only when they have agreed to hear from you. Marketing laws in many countries, including the CAN-SPAM Act, require consent and a working way to opt out.

</Callout>

## How contacts unsubscribe

- Every marketing email has an unsubscribe link in its footer, from the managed footer block or the `{{ unsubscribe_link }}` merge tag. See [The email editor](/docs/marketing/email-editor#the-managed-footer).
- A learner can turn off **Newsletter and marketing emails** in their account profile. The page says that sign-in codes and receipts arrive either way.
- You can turn off **Mailing subscription** on the contact's page. See [Edit a contact](/docs/marketing/contact-details#account-status).

The contact then shows as **Unsubscribed**.

## Emails that are always sent

Some emails are not marketing and are not affected by the subscription: sign-in codes, purchase receipts, access emails and notifications. These go out from your school's mailing service if it is set up, and from CourseLit's default sender if it is not. See [Marketing settings](/docs/marketing/marketing-settings).

## Your address in every email

Marketing emails must include your postal address. CourseLit adds it to the footer from your [mailing address setting](/docs/marketing/marketing-settings) and won't send a broadcast or activate a sequence until you have set it.
