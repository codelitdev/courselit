---
title: Learner sign-in
description: Explain to your learners how they sign in to your school with an emailed code or Google, and what happens on the first visit.
nav_order: 60
---

Learners never create a password. They sign in on your school's website at `/login` using the email address you have for them, either with a one-time code or with Google when it is available.

A learner account belongs to one school. Someone who learns from two schools signs in to each separately, and one school cannot see what they do in the other.

## Sign in with an emailed code

<Steps>

<Step>

### Enter an email address

The learner opens the sign-in page, types their email and clicks **Get code**. This works for new and existing learners, so there is no separate sign-up step.

</Step>

<Step>

### Enter the code

A six-digit code arrives by email, sent in your school's name. The learner types it in and clicks **Continue**. To start again with another address they can click **Use a different email**.

</Step>

<Step>

### Choose a name on the first visit

New learners are asked **What should we call you?**. They can enter a name and click **Continue**, or click **Skip for now** and keep a name made from the start of their email address. They can change it any time on their [account](/docs/learners/account) page.

</Step>

</Steps>

Rules for codes:

- A code is valid for 10 minutes.
- A code allows a few wrong guesses (5), then stops working. The learner must request a new one.
- A new code can be requested every 30 seconds, and up to 5 codes per hour for the same email address.

If the learner arrived from a page that needs sign-in, for example a course or a checkout, they are taken back to it after signing in. Otherwise they land on the [learner dashboard](/docs/learners/learner-dashboard).

## Sign in with Google

When Google sign-in is available for your school, a Google button appears below the email form, separated by **or**. Learners who use it come back to the same destination as the email flow. If Google does not complete, the page shows "Google sign-in didn't finish. Please try again."

## Sign in with your organization's account (SSO)

When your school has turned on single sign-on, a button labelled **Sign in with** followed by the name you chose appears on the sign-in page. Learners sign in at your identity provider and come back to the same destination as the email flow. If you require SSO for an email domain, learners with an address on that domain can only use this button. Setting it up is described in [Single sign-on (SSO)](/docs/self-hosting/single-sign-on).

## How long a sign-in lasts

A session lasts 7 days on a device. A learner can end it earlier with **Log out** in the dashboard menu. An SSO sign-in can end sooner, when your identity provider or the connection's **Longest session** setting sets a shorter limit.

## Learners who cannot sign in

- If you turned off **Portal access** for a contact, sign-in is refused and any existing sessions are ended. See [Contacts and learners](/docs/learners/manage-learners).
- If a contact is being deleted, they can no longer sign in. See [Delete a learner](/docs/learners/delete-learner).
- Sign-in codes are sent by email. If a learner says the code has not arrived, ask them to check their spam folder and then request a new code.

## Terms

If you have published a Terms page for your school, the sign-in page shows "By continuing, you agree to the Terms" with a link to it.
