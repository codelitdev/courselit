---
title: Manage tags
description: See every tag your contacts carry, rename a tag everywhere it is used, or delete tags you no longer need.
nav_order: 40
---

Tags are short labels you put on contacts, such as `customers` or `webinar-signup`. You can filter contacts by tag, start a sequence when a tag is added or removed, and tag contacts automatically from a sequence email.

## Add tags to contacts

You can give a contact tags in three ways:

- Open the contact and add tags in the **Tags** card. See [Edit a contact](/docs/marketing/contact-details#tags).
- Let a sequence email add or remove a tag when it is sent. See [Sequences](/docs/marketing/sequences#tag-contacts-when-an-email-is-sent).
- Have other tools add tags through the API.

## See and manage all tags

Click **Manage tags** on the [Contacts](/docs/marketing/contacts) screen. The **Tags** screen lists every tag your contacts carry, with how many contacts have it. From here you can:

- **Rename** a tag to fix it everywhere it is used.
- **Delete** a tag you no longer need.

Before you change a tag, the screen shows the broadcasts and sequences that refer to it, with links to open them, so you can see what the change affects.

You need the `contacts:read` permission to see tags, and `contacts:write` to rename or delete them.

<Callout type="warning" title="Check where a tag is used first">

Sequences and audiences that depend on a tag use it by name. Renaming or deleting a tag changes who those emails reach. Review the broadcasts and sequences listed for the tag before you confirm.

</Callout>
