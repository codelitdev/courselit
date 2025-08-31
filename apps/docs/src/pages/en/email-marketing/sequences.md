---
title: Email sequences
description: Send email sequences to your audience
layout: ../../../layouts/MainLayout.astro
---

An email sequence (also known as a campaign) is a series of pre-scheduled emails designed to guide recipients through a specific journey, whether it's welcoming new subscribers, promoting a product, or re-engaging inactive customers.

By strategically planning each email, you can provide valuable content, build trust, and encourage actions that align with your business goals.

> This feature is currently in beta, which means you may encounter bugs. Please report them in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> group if you run into any issues.

> **Before you start**: If your school is hosted on [courselit.app](https://courselit.app), you need to get approved to send marketing emails. [Request access here](/en/email-marketing/mail-access-request).

## Sequences Hub

From the `Dashboard`, go to `Mails` to land on the `Broadcasts` hub. The `Sequences` tab is located to the right of it.

Here, you will see all the sequences you have configured.

![Broadcasts Hub](/assets/emails/sequences-hub.png)

## Compose a Sequence

1. Click the `New sequence` button on the right, in the `Sequences` hub.

You will be redirected to the sequence compose screen. The active tab will be `Compose`.

2. Let's get acquainted with the interface.

In the following image, we have marked all the sections. To see the description of a section, note its number in the screenshot and find its description below.

    -   1. **Sequence Name**: The internal name of the sequence.
    -   2. **From**: The sender's name that is displayed in the emails sent.
    -   3. **Entrance Condition**: The condition that triggers this sequence for a user. You can pick from the following conditions:
        - `Tag added`
        - `Tag removed`
        - `Product purchased`
        - `Subscriber added`
        - `Community joined`
        - `Community left`
    -   4. **Entrance Condition Data**: The exact tag or product that triggers the sequence. This field is only relevant in the context of the `Entrance Condition` field.
    -   5. **Save**: A button to save your changes to the sequence.
    -   6. **Start/Pause**: A button to start or pause the sequence. Once paused, the sequence won't be triggered for subsequent events in the system.
    -   7. **Email Row**: Shows an overview of one of the emails in the sequence.
    -   8. **New Email Button**: A button to add a new email to the sequence.

    ![Sequence Compose](/assets/emails/compose-sequence.png)

3. Fill in the details for `Sequence Name`, `From`, `Entrance Condition`, and `Entrance Condition Data` (if applicable), then hit `Save`.

4. Start adding emails to this sequence. When you create a new sequence, an empty email is added to it by default.

    ![Sequence add email](/assets/emails/compose-sequence-add-email.jpeg)

5. Let's understand what information an email row shows:

    ![Sequence email row](/assets/emails/compose-sequence-email-row.jpeg)

    -   1. **Delay Since the Last Sent Email**: This shows the time to wait (in days) since the last email before dispatching this email.
    -   2. **Subject**: The subject of the email.
    -   3. **Published**: The status of the email. Only published emails are sent to users.
    -   4. **Context Menu**: Contains options like `Delete`, etc.

    > The default email has `0 days` as the delay, which means the email will be sent immediately after the user enters the sequence, as it is the first email in the sequence.

6. To edit an email, click on the subject. This will open the email compose screen as shown below.

7. Let's get acquainted with the email compose interface:

    -   1. **Delay**: The delay (in days) between this email and the previous one.
    -   2. **Subject**: The email's subject.
    -   3. **Email Preview**: Live email preview.
            > During the preview, variables will be displayed as placeholders. The actual values will be replaced when sending the actual email.
    -   4. **Status**: Only `Published` emails are sent to users. If you want to skip any email without deleting it from the sequence, just switch its status to `Unpublished`.
    -   5. **Mail Edit Button**: Opens the mail for editing.
    -   6. **Save Button**: A button to save changes to the email's details like subject, status, etc.

    ![Sequence's Email Compose](/assets/emails/compose-sequence-email.png)

8. Edit the email's subject and status, then hit `Save`.
9. Edit the email's content by clicking on the mail edit button. Upon clicking the **Mail Edit** button, a full-page email editor will open where you can edit the email.

    > When done, simply press the exit button. All changes are auto-saved.

    ![Email editor](/assets/emails/email-editor.png)

    We have annotated the screenshot of the CourseLit email editor:

    -   1. **Variables**: You can use these variables in your emails. These variables will be replaced with the actual data when sending the email.
    -   2. **Email Preview**: The live preview of the email.
    -   3. **Settings Pane**: The settings pane for the email and the selected block.
    -   4. **Exit Button**: The email editor exit button.

10. To go back to the sequence settings, click on the `Compose sequence` breadcrumb as shown below.

    ![Go Back to Sequence Settings](/assets/emails/back-to-sequence-breadcrumb.png)

11. Add more emails to the sequence by clicking on the `New email` button.
12. Keep editing your sequence until you think it's perfect. Once you are satisfied with your sequence, hit the `Start` button to begin sending this sequence to users.

## Next Steps

Now that you understand how to create email sequences, you can also see:

- [Send one-off broadcasts](/en/email-marketing/broadcasts)
- [Track your email performance with analytics](/en/email-marketing/analytics)

## Stuck Somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet to <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
