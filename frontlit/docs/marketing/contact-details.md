---
title: Edit a contact
description: Update a contact's name, subscription, sign-in access and tags, or remove them from your school.
nav_order: 30
---

Click a contact on the [Contacts](/docs/marketing/contacts) screen to open their page. The page title is the contact's name, with their email under it. Badges at the top right show whether they are a **Learner** or **Newsletter only**, and whether they are **Subscribed** or **Unsubscribed**.

## Contact details

The **Contact details** card has these fields:

| Field | Notes |
| --- | --- |
| Email address | Read-only. An email address can't be changed after a contact is created. |
| Name | The name shown in lists and used in emails. |
| Bio | A short note, such as a learner bio or your own notes. |

## Account status

The **Account status** card has two switches.

| Switch | What it does |
| --- | --- |
| **Mailing subscription** | On means the contact gets your broadcasts and sequences. Off means they don't, although sign-in codes and receipts still arrive. |
| **Portal access** | On means the contact can sign in to your school. Off means they can't, and they show as **Suspended** in the list. |

## Tags

The **Tags** card lets you add and remove tags on this contact. Type to pick an existing tag or create a new one. Tags help you filter contacts and trigger sequences. See [Tags](/docs/marketing/tags).

## Save your changes

Click **Save changes**. The button is enabled only after you edit something, and **Contact updated.** confirms the save. You need the `contacts:write` permission.

## Remove a contact

At the bottom of the page, the **Danger zone** card has a **Remove contact** button. It appears only if you have the `contacts:delete` permission.

Confirm in the **Remove this contact?** dialog. The contact is removed from your school together with their profile, learning records, tags and subscription settings. This can't be undone.
