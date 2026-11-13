---
title: The email editor
description: Write and design the emails for broadcasts, sequences and templates with blocks, merge tags and a live preview.
nav_order: 80
---

The same full-screen email editor is used for broadcasts, sequence emails and templates. You build the email from blocks and see a live preview as you go.

## Open the editor

- For a broadcast, click **Edit content** on the broadcast page.
- For a sequence, select an email and click **Edit content**.
- For a template, click the template's card.

The top bar has a back button that returns you to the broadcast, sequence or template. If you have unsaved changes, it asks whether to keep editing, discard them or save and leave. Next to it, a status shows whether your work is saved.

In a broadcast, the top bar also has **Send test** and the **Send** and **Schedule** actions, so you can finish without going back. See [Broadcasts](/docs/marketing/broadcasts).

## Blocks

Marketing emails are built from these blocks:

| Block | Use it for |
| --- | --- |
| Text | Paragraphs of text. |
| Image | A picture. |
| Link | A link. |
| Separator | A dividing line. |
| Footer | The footer that carries your postal address and unsubscribe link. |

Select a block in the preview to change its settings.

## Merge tags

Type `{{` while writing to insert a merge tag. CourseLit replaces each tag with real values when the email is sent. In previews they show as placeholders.

| Tag | Inserts |
| --- | --- |
| `{{ subscriber.email }}` | The subscriber's email address |
| `{{ subscriber.name }}` | The subscriber's name |
| `{{ subscriber.tags }}` | The subscriber's assigned tags |
| `{{ address }}` | Your school's mailing address |
| `{{ unsubscribe_link }}` | The mandatory unsubscribe link |

## The managed footer

Every marketing email carries a footer with your mailing address and an unsubscribe link, filled in when the email is sent. Keep it in the email. See [Subscriptions and unsubscribing](/docs/marketing/subscriptions-and-unsubscribing) and [Marketing settings](/docs/marketing/marketing-settings).

## Before you send

The editor checks your email before sending. An email can't be sent or activated when:

- It has no subject.
- Its body is empty.
- It still has the starter text "Start writing here" or "Add your message, links, and call to action." and nothing else.

Use **Send test** to look at the real email in your inbox. The test looks like the real email, with `[Test]` added to the subject.
