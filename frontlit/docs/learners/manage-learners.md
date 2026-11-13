---
title: Contacts and learners
description: Find learners in your school, edit their details, control whether they can sign in, and see how they differ from newsletter subscribers.
nav_order: 20
---

Everyone who has signed in to your school, bought something, been invited to a product or subscribed to your mailing list appears on the **Contacts** screen. Learners are the contacts who have signed in to your school's website.

To open it, click **Contacts** in the left-hand navigation. You need the `contacts:read` permission to see the screen, `contacts:write` to change a contact, and `contacts:delete` to remove one.

## Learners and newsletter-only contacts

Each row shows the person's name and email, plus badges:

| Badge | Meaning |
| --- | --- |
| Learner | The person has signed in to your school's website at least once. |
| Suspended | The person has signed in before, but you turned off their portal access. |
| Newsletter only | The person is on your list but has not signed in yet. This includes people you invited to a product who have not used their invite, and people who only subscribed to your mailing list. |
| Subscribed / Unsubscribed | Whether the person receives your broadcasts and sequences. |

Below the name you see the contact's tags and when they joined. Click a row to open the contact.

The list is paged, 50 contacts at a time, with **Previous** and **Next** buttons.

## Filter and segment the list

Use the filter bar above the list to narrow it down. You can combine filters and match either all or any of them.

| Filter | What it matches |
| --- | --- |
| Email | Email is exactly, contains or does not contain a value. |
| Tag | Contact has or does not have a tag. |
| Subscription | Contact is subscribed or unsubscribed. |
| Product | Contact has access, or does not have access, to a product. |
| Community | Contact is a member, or is not a member, of your community. |
| Last active | Before, after or on a date. |
| Signed up | Before, after or on a date. |
| Permission | Contact has or does not have a team permission. |

The count next to the filter bar shows how many contacts match. You can save a filter as a named segment and pick it again later. Segments and tags are also used for email marketing, see [Marketing](/docs/marketing).

If nothing matches, click **Clear filters**. Tags have their own screen, opened with **Manage tags**.

## Edit a contact

Click a contact to open its page.

| Field | What it does |
| --- | --- |
| Email address | Shown for reference. It cannot be changed after the contact is created. |
| Name | The name shown to the learner and in your admin screens. |
| Bio | A note about the learner. |
| Mailing subscription | When off, the contact does not get broadcasts or sequences. Sign-in codes and receipts are still sent. |
| Portal access | When off, the learner cannot sign in. |
| Tags | Labels you can use in filters and segments. |

Click **Save changes** to apply your edits.

### Suspend a learner

Turn off **Portal access** and save. The learner is signed out of every device straight away and cannot sign in again until you turn it back on. Their memberships and progress are kept, so nothing is lost when you turn access back on. Suspended learners show a **Suspended** badge in the list.

## Remove a contact

At the bottom of the contact page, the **Danger zone** has a **Remove contact** button if you have the `contacts:delete` permission. Removing a contact deletes the person from your school. Read [Delete a learner](/docs/learners/delete-learner) before you do it, because it cannot be undone.

## Related pages

- [Invite a learner to a product](/docs/learners/invite-learners)
- [Product customers](/docs/learners/product-customers)
