---
title: Product customers
description: See everyone with access to a course or download, check their progress, cancel a subscription and remove access.
nav_order: 40
---

Each product has a **Customers** screen that lists the people who have, or used to have, access to it. Use it to check progress, see how someone is paying, and take access away.

To open it, go to **Products**, open a product, click the **More actions** button (the three dots) in the product header and choose **Customers**. You need the `products:read` permission to view the list. Cancelling a subscription and removing access need `products:write`.

## Read the customer list

Use **Search customers** to find someone by name or email. The list shows 25 customers per page.

| Column | What it shows |
| --- | --- |
| Name | The learner's name and email. Click it to open their contact page. |
| Status | The status of their membership. See [Membership statuses](/docs/learners/membership-status). |
| Progress | A progress bar and percentage for courses. For downloads this column is **Downloaded**, which says **Yes** once the learner has used their download link and **Not yet** before that. |
| Signed up | The date their membership was created. |
| Last active | The last time the learner was active in your school. |
| Subscription | For paid recurring plans: **Active**, **Past due**, **Ends** followed by a date, **Ended**, or for installment plans how many installments are paid, such as 2/6 paid, or **Installments paid**. |

If a learner has several memberships for the same product, for example one bought directly and one included in a community plan, the screen shows the most relevant one.

## See lesson-by-lesson progress

For courses, click **View** beside the progress bar. A dialog titled with the learner's name shows each published lesson with a check mark when it is completed. Progress counts only published lessons.

## Cancel a subscription

If the customer is on a subscription that is active or past due, open the actions menu (the three dots at the end of the row) and choose **Cancel subscription**.

The customer is not charged again and keeps access until the end of the current billing period. The **Subscription** column then shows **Ends** with the date.

## Remove access

Open the actions menu and choose **Remove access**. The confirmation tells you what will happen:

- The customer loses access to the product immediately.
- If they have a running subscription, it is cancelled immediately and they are not refunded automatically. Issue any refund yourself with your payment provider.
- The membership moves to **Expired**.

<Callout type="warning" title="Removing access cannot be undone from this screen">

The customer's progress is kept, but to give them access again you need to invite them again. See [Invite a learner to a product](/docs/learners/invite-learners).

</Callout>

**Remove access** is not offered for memberships that are already **Expired** or **Rejected**.
