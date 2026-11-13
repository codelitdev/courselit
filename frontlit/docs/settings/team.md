---
title: Manage your team
description: Invite people to your school, choose what they can do, and change or remove their access.
nav_order: 20
---

A school can have a team of people who help you run it, such as co-teachers, assistants or a designer. Each team member signs in with their own account and gets only the permissions you choose.

The person who created the school is its **owner** and always has full access. Open **Settings** then **Team** to manage everyone.

## See the team

The **Team members** card lists the people who can access the school, then pending invitations. Each member shows their name and email, and a label for their access: **Owner**, a preset name such as **Content manager**, or a count such as `3 custom permissions`.

You need the `members:read` permission to see the team. If you can view the team but not invite people, a note says so.

## Invite a team member

<Steps>

<Step>

### Click Invite member

On the **Team** tab, click **Invite member**. The button is disabled if you don't have `members:invite` or `members:manage`.

</Step>

<Step>

### Enter an email and choose access

In the **Invite a team member** dialog, enter the person's **Email**. Pick a **Permission preset**, or choose **Custom** and tick the individual permissions. See [Permissions](/docs/settings/permissions).

</Step>

<Step>

### Send the invitation

Click **Send invitation**. CourseLit emails the person a link and also shows an **Invitation ready** card with the same link and a copy button, so you can share it yourself. The link expires after 7 days.

</Step>

</Steps>

You can only give permissions that you have yourself, unless you are the owner.

## What the invited person does

The person opens the link and signs in with the email address you invited. They see the school name, who invited them and the access they will get, and choose **Accept** or **Reject**. After they accept, they join the school and it opens for them.

The invitation only works for the email address you entered, and an address can't be invited again while an invitation is pending or if it already belongs to a team member.

## Change or remove a member

For each member who is not the owner, two buttons appear at the end of the row.

- **Edit permissions** opens a dialog with the **Permission preset** and the individual permissions. Click **Save permissions** to apply them. You can't edit your own permissions, and you can only edit someone whose permissions are all ones you also have.
- **Remove member** asks you to confirm in the **Remove team member?** dialog. The person loses access to the school immediately.

Both need the `members:manage` permission.

## Pending invitations

Each pending invitation shows the email, the access it gives, when it expires and a **Pending** label. Two buttons act on it:

- **Revoke** cancels the invitation so the link stops working. It needs `members:manage`.
- **Resend** opens the invitation form filled in with the same email and permissions.

<Callout type="note">

If you need a fresh link for someone who was already invited, revoke the old invitation first, then invite them again.

</Callout>
