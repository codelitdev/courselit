---
title: Build an email sequence
description: Create a series of emails that sends itself when a trigger happens, such as a new subscriber or a purchase.
nav_order: 60
---

A sequence is a series of emails that goes out automatically. Someone enters the sequence when its **trigger** happens, for example when they subscribe, get a tag, or get access to a product, and then receives each email after the wait you set. Sequences are good for welcome series, course onboarding and re-engagement.

Open **Marketing** then **Sequences** to see all your sequences. Each row shows the title, a status (**Active**, **Paused** or **Draft**), how many emails it has and how many contacts are currently in it. The buttons at the end of a row activate or pause the sequence, or delete it. Deleting from the list happens straight away, without a confirmation.

You need the `contacts:write` permission to create and change sequences.

## Create a sequence

<Steps>

<Step>

### Click New sequence

On the **Sequences** screen, click **New sequence**.

</Step>

<Step>

### Name it

Enter a **Sequence title**, for example `New Student Onboarding`, and click **Create**. The sequence editor opens.

</Step>

</Steps>

## Choose the trigger

In the sequence editor, the trigger picker decides when someone enters the sequence. The triggers are:

| Trigger | Extra choice |
| --- | --- |
| A new contact subscribes | None |
| A tag is added to a contact | The tag name |
| A tag is removed from a contact | The tag name |
| A learner gets access to a product | A product, or **Any product** |
| A learner joins the community | None |
| A learner leaves the community | None |

## Set the audience

Two filter builders decide who can enter:

- **Audience** lists the filters contacts must match. Only subscribed contacts who match enter the sequence. It starts as **Everyone**.
- **Exclude** lists filters for contacts who should never enter, even if they match the audience. It starts as **Nobody**.

The **View in browser** switch works the same way as for [broadcasts](/docs/marketing/broadcasts#set-up-the-broadcast).

## Add and edit the emails

Under the emails list, click **Add email** and choose a template for it. The new email is selected so you can edit it. You can reorder the emails in the list and delete ones you no longer want.

For the selected email you can set:

| Setting | What it does |
| --- | --- |
| **Subject** | The subject line. |
| **Published** | Only published emails are sent. Turn it off to skip an email without deleting it. |
| **Send after (days)** | How long to wait before this email is sent. The first email starts at 0, so it goes out as soon as someone enters the sequence. Emails you add after that start at 1 day. The list shows **Immediately** or how many days later. |
| **On send, tag contact** | **No action**, **Add tag** or **Remove tag**, with a **Tag name**. |
| **Content** | **Edit content** opens the [email editor](/docs/marketing/email-editor). |

You can also click **Send test** to send the selected email to yourself or up to 5 other addresses.

### Tag contacts when an email is sent

The **On send, tag contact** setting adds or removes one tag on the contact when that email goes out. Use it to mark who has received an email, then filter contacts by that tag.

## Save, activate and pause

Edits are not saved in the background. Click **Save** to keep them. If you try to leave with unsaved changes, the browser asks you first, and some actions such as **Activate** and **Edit content** save them for you.

Click **Activate** to start the sequence. Click **Pause** to stop it. While it is paused, nobody new enters.

**Activate** is disabled, with the reason shown, until:

- At least one email is published.
- Every published email has a subject and a body that is not empty or still the placeholder text.
- You have added your [mailing address](/docs/marketing/marketing-settings). If it is missing, a dialog sends you to **Open mail settings**.

## Watch the results

Once a sequence is no longer a draft, two more cards appear.

- **Performance** shows key numbers such as emails sent, open rate and click-through rate, with a refresh button.
- **Subscribers** lists the contacts in the sequence with their status.

## Tips

<Callout type="tip">

Send a test of each email to yourself before you click **Activate**, and check the preview on the email's card.

</Callout>
