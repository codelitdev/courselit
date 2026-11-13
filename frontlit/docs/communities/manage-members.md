---
title: Manage members
description: Approve or reject join requests, invite people, change member roles and remove members from your community.
nav_order: 50
---

The **Members** tab lists everyone who has joined, asked to join or been removed from your community. You need the `communities:write` permission to see it.

A number on the tab shows how many join requests are waiting for you. When there are more than one page of them, it reads like "10+".

## Read the member list

Use the filter above the list to switch between **All**, **Waiting**, **Active** and **Rejected** members. **Load more members** shows the next page.

| Column | What it shows |
| --- | --- |
| Member | Name and email. For a waiting request, also the answer to "Why they want to join". For a rejected member, the reason you gave. |
| Plan | The plan they joined on. For paid recurring plans, the payment method and a short subscription ID, with a button to copy the full ID. Shows **Archived plan** if you archived it since. |
| Status | **Active**, **Waiting**, **Rejected**, **Payment failed**, **Expired** or **Paused**. See [Membership statuses](/docs/learners/membership-status). |
| Role | **Owner**, **Moderator** or **Member**. |
| Joined | How long ago they joined. |

## Approve or reject a request

Requests appear only when **Who gets in** is set to **Only people I approve**, and only for free plans. Paid plans let people in as soon as they have paid. See [Community details](/docs/communities/details).

When there are waiting requests, a banner says how many people are waiting, with a **Show requests** button.

- To let someone in, click **Approve**. They become **Active**, and any products included in their plan are granted to them.
- To turn someone down, click **Reject**, write a reason in the **Reason** field and click **Reject request**. A reason is required.

## Invite someone

Click **Invite** above the list. The button is disabled until the community is live and has at least one active plan.

1. Enter their **Email**, an optional **Name** and choose a **Plan**.
2. Click **Send invite**.

The person joins right away on the plan you chose, together with its included products, and no payment is taken. They get an email, "You're invited to" followed by the community's name, with a **Go to the community** button. An invite counts as approval, so it works even when you approve members manually.

## Change a role

For an active member, use the **Role** menu to choose:

| Role | What the member can do |
| --- | --- |
| Member | Take part in the spaces they can access: post, comment, react and report. |
| Moderator | Everything a member can, plus pin posts and delete other members' posts and comments. |

The **Owner** role belongs to the school owner and cannot be changed. You cannot change your own membership, and you cannot demote or remove the last moderator.

## Remove a member

Click **Remove** next to an active member, write a **Reason** and click **Remove member**. A reason is required and is kept with the membership.

The member loses access right away. If they are paying for a community subscription, it is cancelled with the payment provider first, so they are not charged again. If the provider cannot be reached, nothing changes and you can try again. Products that were included in their plan expire with the membership.

Rejected and removed members appear under **Rejected**. Click **Let back in** to reactivate them.

## Good to know

- Members can also leave on their own. See [What members see](/docs/communities/member-experience).
- If you take the community offline, members cannot get in until you bring it back. See [Take the community offline](/docs/communities/take-offline).
