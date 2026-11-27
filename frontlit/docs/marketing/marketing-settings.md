---
title: Marketing settings
description: Add the mailing address that every marketing email needs, change it later, and learn what the delivery notice means.
nav_order: 100
---

Anti-spam law requires a postal address in every marketing email. CourseLit asks for it the first time you open **Marketing**.

## Get ready to send email

Until your school has a mailing address, **Broadcasts**, **Sequences**, **Templates** and **Settings** under **Marketing** show a **Get ready to send email** screen instead of their content.

<Steps>

<Step>

### Enter your address

Fill in **Street address**, **Address line 2** (optional), **City**, **State or region** (optional), **Postal code** and **Country**. A PO box or business address works too, if you'd rather not share your home address.

The preview beside the form, **Where your address appears**, is a marketing email rendered exactly as it is sent, so its footer shows your address the way recipients will see it: one part per line, then the **View in browser** and **Unsubscribe** links.

</Step>

<Step>

### Save

Click **Save and continue**. The screen you opened appears. **Street address** and **Postal code** are required.

</Step>

</Steps>

## Change your mailing address

Open **Marketing** then **Settings** in the sidebar. The screen is titled **Mail delivery** and shows the same fields and preview, filled in with your saved address. Change what you need and click **Save**. **Mailing address saved.** confirms it. You need the `contacts:write` permission.

CourseLit puts this address in the footer of every marketing email through the `{{ address }}` merge tag.

<Callout type="warning" title="You can't send without it">

Until a mailing address is saved, broadcasts can't be sent and sequences can't be activated. The broadcast and sequence editors show an **Add mailing address** banner, and sending or activating opens a dialog with an **Open mail settings** button that brings you here.

</Callout>

## The delivery notice

If your school's mailing service isn't set up, a banner reading "Your school's mailing service isn't set up" appears on the Settings screen and on the broadcasts, sequences and templates screens. It means:

- Purchase receipts, access emails and notifications are still delivered, but from CourseLit's default sender instead of your school.
- Broadcasts and sequences can't be sent until the mailing service is ready.

See [Subscriptions and unsubscribing](/docs/marketing/subscriptions-and-unsubscribing) for how subscriptions affect who receives your emails.
