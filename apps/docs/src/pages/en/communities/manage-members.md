---
title: Manage Members
description: Guide to managing memberships in your community
layout: ../../../layouts/MainLayout.astro
---

Managing members in your community is essential for maintaining an active and engaged group. This guide will walk you through the process of reviewing and managing memberships, including changing member statuses and handling membership requests.

> The feature is currently in beta, which means you may encounter bugs. Please report them in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> group if you run into any.

## Viewing Memberships

1. Navigate to the **Memberships** section in your community dashboard.
2. Here, you can see a list of all members, including their:
    - **Name**
    - **Email**
    - **Subscription ID** (if available)
    - **Subscription Method** (if available, e.g., Stripe)
    - **[Status](#changing-member-status)** (Pending, Active, Rejected)
    - **[Role](#changing-member-role)** (Comment, Post, Moderate)

![Community membership dashboard](/assets/communities/membership-dashboard.png)

## Changing Member Status

1. Locate the member whose status you want to change.
2. Click on the **Circular Arrow Icon** button next to the member's status to cycle through the statuses:
    - **Pending**: The member has requested to join but has not been approved yet.
    - **Active**: The member is fully approved and can participate in the community.
    - **Rejected**: The member's request has been denied.

## Changing Member Role

1. Locate the member whose role you want to change.
2. Click on the **Circular Arrow Icon** button next to the member's role to cycle through the statuses:
    - **Comment**: The member can like posts and leave comments. In free communities, this is the default role for new members.
    - **Post**: The member can create original posts in addition to commenting and liking. Paid subscribers and auto-joined members start with this role.
    - **Moderate**: The member can moderate the community, with all permissions except deleting the community.

## Rejecting a Membership Request

1. When transitioning a member to the **Rejected** state, you will be prompted to provide a reason for rejection.
2. Enter the reason in the provided text box.
3. Click **Confirm Rejection** to finalize the action.

## Handling Membership Requests

1. Review new membership requests regularly to ensure timely responses.
2. Use the **Auto Accept Members** setting to automatically approve new members if desired.

## Membership Details

-   **Subscription ID**: Unique identifier for the member's subscription (if available).
-   **Subscription Method**: The payment method used by the member (if available, e.g., Stripe).
-   **Status**: Current status of the member (Active, Pending, Rejected).

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
