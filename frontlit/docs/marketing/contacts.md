---
title: Find and segment contacts
description: Browse your contacts, narrow them down with filters and save useful filters as segments.
nav_order: 20
---

The **Contacts** screen lists everyone in your school's audience: learners, people who bought something, and people who only signed up for your newsletter. Open it from **Contacts** in the sidebar. You need the `contacts:read` permission.

## Read the list

Contacts are listed 50 per page with **Previous** and **Next** buttons. Each row shows the contact's name and email, and these labels:

| Label | Meaning |
| --- | --- |
| Subscribed or Unsubscribed | Whether they receive your marketing emails. |
| Learner | They have an account on your school and can sign in. |
| Suspended | They have an account but their portal access is turned off. |
| Newsletter only | They gave you their email but have no learner account. |

Below the name you can see the contact's tags, or **No tags**, and the date they joined. Click a row to open the contact. See [Contact details](/docs/marketing/contact-details).

New contacts appear on their own when someone registers, gets access to a product or signs up through a newsletter form. You can't add a contact by hand from this screen.

## Filter contacts

The filter bar above the list narrows the contacts. Add one or more filters and the list, together with the count next to it, updates after a short pause. If you add several, choose whether contacts must match any or all of them.

| Filter | Conditions |
| --- | --- |
| Email | is exactly, contains, does not contain |
| Tag | has, does not have |
| Subscription | is Subscribed, is Unsubscribed |
| Product | has access to, does not have access to a product you choose |
| Community | is a member, is not a member |
| Last active | before, after, on a date |
| Signed up | before, after, on a date |
| Permission | has, does not have a team permission |

If no contact matches, the list says **No matching contacts** and offers **Clear filters**.

## Save a segment

A segment is a saved filter you can reuse.

<Steps>

<Step>

### Build the filter

Add the filters you want, so the count shows the right people.

</Step>

<Step>

### Save it as a segment

Choose to save a new segment, give it a name and save. The segment is selected right away.

</Step>

<Step>

### Use it again

Open the **Segments** menu on the filter bar and pick the segment to apply its filters. You can delete a segment from the same menu. Deleting a segment doesn't delete any contacts.

</Step>

</Steps>

Saving and deleting segments needs the `contacts:write` permission.

Segments are for you to find people quickly. When you send a broadcast or build a sequence, you set the audience with the same filters on that screen. See [Broadcasts](/docs/marketing/broadcasts).

## Manage tags

Click **Manage tags** at the top of the Contacts screen to rename or delete tags. See [Tags](/docs/marketing/tags).
