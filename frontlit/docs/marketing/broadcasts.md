---
title: Send a broadcast
description: Write a one-time email, choose its audience, then send it now or schedule it for later.
nav_order: 50
---

A broadcast is a one-time email, such as an announcement, a newsletter or a promotion. You choose who receives it, then send it right away or schedule it.

Open **Marketing** then **Broadcasts** in the sidebar to see all your broadcasts. Each row shows the title and subject, a status, when it was or will be sent, how many recipients it has, and a delete button.

## Before you begin

- Add your [mailing address](/docs/marketing/marketing-settings). You can't send until you have.
- If a banner says your school's mailing service isn't set up, purchase receipts and notifications still go out from a default sender, but broadcasts and sequences can't be sent until the mailing service is ready.
- You need the `contacts:write` permission to create and send broadcasts.

## Create a broadcast

<Steps>

<Step>

### Click New broadcast

On the **Broadcasts** screen, click **New broadcast**.

</Step>

<Step>

### Enter a subject and choose a template

Type the **Subject**, for example `Exciting news and course releases this month`. Under **Choose a template**, pick a starting layout. **Blank** is selected by default, and your own [templates](/docs/marketing/templates) appear next to the built-in ones.

</Step>

<Step>

### Click Start editing

CourseLit creates the broadcast and opens its page.

</Step>

</Steps>

## Set up the broadcast

The broadcast page has these parts:

| Part | What you do |
| --- | --- |
| **Title** | The internal name of the broadcast, up to 160 characters. |
| **Audience** | Use the filters to choose recipients. The count shows how many **recipients** match. The default is **Everyone**. |
| View in browser | A switch that decides whether the email includes a link to view it in a browser. |
| Email card | Shows a preview of the email, with **Edit content** to open the [email editor](/docs/marketing/email-editor) and **Send test** to send a test copy. |

Only subscribed contacts who match the audience receive the broadcast. See [Subscriptions and unsubscribing](/docs/marketing/subscriptions-and-unsubscribing). Click **Save** to keep changes to the title and audience. Opening the editor or sending also saves them.

To send yourself a preview, click **Send test**, enter up to 5 addresses separated by commas, or leave the box empty to send it to yourself. The test looks like the real email with `[Test]` added to the subject.

## Send now or schedule

When the email is ready, two buttons appear at the top right.

- **Send now** opens a confirmation. Click **Send now** again to send immediately. This can't be undone.
- **Schedule** opens a **Delivery date & time** picker in your own time zone. Choose a time in the future and click **Schedule broadcast**.

These buttons are disabled, with the reason shown, when:

- The subject is empty, the body is empty, or it still has the placeholder text "Start writing here".
- No contacts match the audience, or the recipient count couldn't be loaded.
- The recipient count is still updating.

If your mailing address is missing, a dialog sends you to **Open mail settings** to add it.

## Cancel a scheduled broadcast

A scheduled broadcast shows **Scheduled for** with the date and time. Click **Cancel send** to stop it. The broadcast becomes **Paused**, and you can edit it, then send or schedule it again.

## Broadcast statuses

| Status | Meaning |
| --- | --- |
| Draft | Not sent or scheduled yet. You can edit everything. |
| Scheduled | Waiting for its delivery time. |
| Sending | Being delivered now. |
| Sent | Delivery is complete. |
| Paused | A scheduled send was cancelled. You can edit and resend it. |

You can edit the title, audience and content only while a broadcast is a draft or paused.

## See how it performed

Once a broadcast is sending, sent or paused, a **Performance** card appears on its page with key numbers such as how many emails were sent, the open rate and the click-through rate. Click its refresh button to update the numbers.

## Delete a broadcast

Click the delete button at the end of its row, then **Delete broadcast** in the confirmation. The broadcast and its email content are deleted permanently.
