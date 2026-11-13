---
title: Membership statuses
description: Understand each membership status, what causes it and whether the learner can get in.
nav_order: 50
---

A membership connects one learner to one product or to your community. Everything a learner can access, including lesson progress, downloads, certificates, purchases and subscriptions, hangs off a membership.

The status tells you whether the learner currently has access. Only an **Active** membership gives access.

| Status | Learner has access | What it means |
| --- | --- | --- |
| Active | Yes | The learner has access. Free plans, successful payments, invites, and approved community requests all end up here. |
| Pending | No | Access is not decided yet. For a product this is a checkout that has started but is not paid. For your community it is a request waiting for your approval. |
| Payment failed | No | A recurring payment, such as a subscription or an installment, was not collected. |
| Expired | No | Access ended. See below for the common reasons. |
| Rejected | No | You turned down a community join request, or removed a community member. The reason you entered is kept with the membership and shown on the Members tab. |
| Paused | No | Access is on hold until the membership becomes active again. |

## What moves a membership between statuses

| Event | Result |
| --- | --- |
| A learner picks a free plan, or is invited to a product | Active |
| A learner starts a paid checkout | Pending until the payment is confirmed, then Active |
| A learner asks to join a community that needs approval | Pending until you approve (Active) or reject (Rejected) |
| A recurring payment fails | Payment failed |
| A subscription ends, or a payment is refunded in full or disputed | Expired |
| You use **Remove access** on a product customer | Expired |
| You remove a community member | Rejected |
| A learner leaves your community | Access ends right away and any billing is cancelled |

A partial refund does not change access. The learner stays active and the purchase shows as **Partly refunded** in their purchase history.

## Memberships included with a community plan

A community plan can include products. The learner then gets a separate, included membership for each product. These follow the community membership:

- They become active when the community membership becomes active. For plans that need approval, this is when you approve the request.
- They expire when the community membership ends, for example when you remove the member, or the member leaves.

See [Grant access to additional products](/docs/communities/included-products).

## Where you see statuses

- **Products**: the **Status** column of a product's [Customers](/docs/learners/product-customers) screen.
- **Community**: the **Status** column of the community's [Members](/docs/communities/manage-members) tab, where Pending is shown as **Waiting**.
