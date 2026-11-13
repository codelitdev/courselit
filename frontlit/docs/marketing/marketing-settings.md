---
title: Marketing settings
description: Add the mailing address that every marketing email needs and learn what the delivery notice means.
nav_order: 100
---

Open **Marketing** then **Settings** in the sidebar. The screen is titled **Mail delivery** and holds the address your emails need to meet email compliance rules.

## Add your mailing address

<Steps>

<Step>

### Enter your address

In the **Mailing Address** box, type your postal address. The note under the box says it is required to comply with the CAN-SPAM Act.

</Step>

<Step>

### Save

Click **Save**. **Mailing settings saved.** confirms it. You need the `contacts:write` permission.

</Step>

</Steps>

CourseLit puts this address in the footer of every marketing email through the `{{ address }}` merge tag.

<Callout type="warning" title="You can't send without it">

Until a mailing address is saved, broadcasts can't be sent and sequences can't be activated. The broadcast and sequence screens show an **Add mailing address** banner, and sending or activating opens a dialog with an **Open mail settings** button that brings you here.

</Callout>

## The delivery notice

If your school's mailing service isn't set up, a banner reading "Your school's mailing service isn't set up" appears on the Settings screen and on the broadcasts, sequences and templates screens. It means:

- Purchase receipts, access emails and notifications are still delivered, but from CourseLit's default sender instead of your school.
- Broadcasts and sequences can't be sent until the mailing service is ready.

See [Subscriptions and unsubscribing](/docs/marketing/subscriptions-and-unsubscribing) for how subscriptions affect who receives your emails.
