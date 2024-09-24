---
title: Email sequences
description: Send email sequences to your audience
layout: ../../../layouts/MainLayout.astro
---

An email sequence (aka campaign) is a series of pre-scheduled emails designed to guide recipients through a specific journey, whether it's welcoming new subscribers, promoting a product, or re-engaging inactive customers.

By strategically planning each email, you can provide valuable content, build trust, and encourage actions that align with your business goals.

> The feature is currently in beta, which means you may encounter bugs. Please report them in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> group if you run into any.

> **Before you start**: If your school is hosted on [courselit.app](https://courselit.app), you need to get approved for sending marketing emails. [Request access here](/en/email-marketing/mail-access-request).

## Sequences Hub

From the `Dashboard`, go to `Mails` to land on the `Broadcasts` hub. The `Sequences` tab is located to the right of it.

Here you will see all the sequences you have configured.

![Broadcasts Hub](/assets/emails/sequences-hub.png)

## Compose a Sequence

1. Click on the `New sequence` button on the right, in the `Sequences` hub.

2. Let's get acquainted with the interface. In the following image, we have demarcated all the sections. To see the description of a section, notice its number in the screenshot and find its description below.

    -   1. **Sequence Name**: Internal name of the sequence.
    -   2. **From**: The sender's name that gets displayed in the emails sent.
    -   3. **Entrance Condition**: The condition that triggers this sequence for a user. You can pick from the following conditions:
        - `Tag added`
        - `Tag removed`
        - `Product purchased`
        - `Subscriber added`
    -   4. **Entrance Condition Data**: The exact tag or product that triggers the sequence. This field is only relevant in the context of the `Entrance Condition` field.
    -   5. **Save**: A button to save your changes to the sequence.
    -   6. **Start/Pause**: A button to start or pause the sequence. Once paused, the sequence won't be triggered for subsequent triggers occurring in the system.
    -   7. **Email Row**: Shows an overview of one of the emails in the sequence.
    -   8. **New Email Button**: A button to add a new email to the sequence.

    ![Sequence Compose](/assets/emails/compose-sequence.png)

3. Fill in the details for `Sequence Name`, `From`, `Entrance Condition`, and `Entrance Condition Data` (if applicable) and hit `Save`.

4. Let's start adding mails to this sequence. When you create a new sequence, an empty email is added to it by default.

5. Let's understand what information an email row shows:

    -   1. **Delay Since the Last Sent Email**: This shows the time to wait (in days) since the last email before dispatching this email.
    -   2. **Subject**: The subject of the email.
    -   3. **Context Menu**: Houses options like `Delete`, etc.

    > The default email has `0 days` as the delay, which signifies that the email should wait for 0 days since the last sent email. Since this is the first email in the sequence, it will be sent right away as soon as a user enters the sequence.

6. To edit the body of an email, click on the subject. This will open the email compose screen as shown below.

7. Let's get acquainted with the email compose interface:

    -   1. **Delay**: The delay (in days) between this email and the previous one.
    -   2. **Subject**: The email's subject.
    -   3. **Preview Text**: The preview text that gets displayed in email inboxes.
    -   4. **Status**: Only `Published` emails are sent to the users. If you want to skip any email without deleting it from the sequence, just switch its status to `Unpublished`.
    -   5. **Variables**: [Liquid](https://liquidjs.com/) templating variables that are available for you to use in your email body.
    -   6. **Email Compose Window**: Email content goes here.
    -   7. **Email Preview**: Live email preview.
            > During the preview, the Liquid variables will be displayed as placeholders. The actual values will be replaced when sending the actual mail.
    -   8. **Save Button**: A button to save changes to the email.

    ![Sequence's Email Compose](/assets/emails/compose-sequence-email.png)

8. Compose the email and hit `Save`.
9. To go back to the sequence settings, click on the `Compose sequence` breadcrumb as shown below.

    ![Go Back to Sequence Settings](/assets/emails/back-to-sequence-breadcrumb.jpeg)

10. Add more emails to the sequence by clicking on the `New email` button.
11. Keep editing your sequence until you think it's perfect. Once you are satisfied with your sequence, hit the `Start` button to start sending this sequence to the users.

## Next Step

Let's see how you can create and edit your website's pages. [Click here](/en/pages/introduction).

## Stuck Somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet to <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
