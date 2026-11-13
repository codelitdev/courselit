---
title: Permissions and roles
description: Understand the permission presets, the individual permissions and how they apply to team members and API keys.
nav_order: 30
---

CourseLit controls what each person can do with permissions. You give permissions to a team member when you invite them or edit them, and to an API key when you create it. The school owner always has every permission.

## Presets

When you invite someone or create an API key, you first pick a **Permission preset**. A preset fills in a ready-made set of permissions. Choose **Custom** to tick individual permissions instead. If you tick an individual permission, the preset switches to **Custom**.

| Preset | Intended for | Includes |
| --- | --- | --- |
| Full access | Someone who runs the school with you | Every permission, including school settings, team administration, deleting and community moderation. |
| Content manager | Course and website creators | Products (including publish and delete), website (including publish), media (including delete), certificates and analytics. |
| Community manager | People who look after the community | Communities (including moderation), contacts (read), media (read and write) and analytics. |
| Support | Helping learners | Products (read), contacts (read and write), communities (read and moderate) and commerce (read). |
| Marketing | Email and website marketing | Website (including publish), contacts (read and write), mail (read, write and send), media (read and write) and analytics. |
| Read-only | Looking but not changing | The `read` permission of every group. |
| Custom | Anything else | Exactly the permissions you tick. |

Choosing **Full access** shows a warning, because it includes school settings, member administration, destructive actions and community moderation.

## How permissions combine

Permissions come in levels. A higher level includes the lower ones, so you don't have to tick both. In the permission list these are shown as `(implied)`.

- `write` includes `read` for the same group.
- `publish`, `delete` and `moderate` include `write` and `read`.
- `members:invite` and `members:manage` include `members:read`.
- `commerce:refund` includes `commerce:manage` and `commerce:read`.
- `mails:send` includes `mails:write` and `mails:read`.
- `integrations:manage` includes `integrations:read`.

Permissions that can do the most damage, such as removing members, deleting products, contacts or media, moderating the community and refunding payments, are labelled **sensitive** in the picker.

## The permission list

| Group | Permissions | What they control |
| --- | --- | --- |
| Team | `members:read`, `members:invite`, `members:manage` | See the team, invite people, and edit or remove members and revoke invitations. |
| School | `school:read`, `school:write` | See school settings, and change your custom domain, code injection and currency. |
| Products | `products:read`, `products:write`, `products:publish`, `products:delete` | See, edit, publish and delete courses and downloads. |
| Community | `communities:read`, `communities:write`, `communities:moderate` | See, edit and moderate communities. |
| Website | `storefront:read`, `storefront:write`, `storefront:publish` | See and edit pages, blog posts and branding, and publish or delete them. |
| Commerce | `commerce:read`, `commerce:manage`, `commerce:refund` | `commerce:manage` is required to see and change payment settings. |
| Contacts | `contacts:read`, `contacts:write`, `contacts:delete` | See, edit and remove contacts, and use the Marketing screens. |
| Mail | `mails:read`, `mails:write`, `mails:send` | Listed for mail access. See the note below. |
| Media | `media:read`, `media:write`, `media:delete` | See, upload and delete files in the media library. |
| Certificates | `certificates:read`, `certificates:write` | See and edit certificate templates. |
| Analytics | `analytics:read` | See the school overview and product analytics. |
| Billing | `billing:read` | See your school's plan entitlement. |
| Integrations | `integrations:read`, `integrations:manage` | Listed for integrations. See the note below. |

<Callout type="note" title="Marketing uses the contacts permissions">

The Marketing screens, which cover broadcasts, sequences, templates and mailing settings, check `contacts:read` and `contacts:write`, not the `mails:` permissions. To let someone send email, give them `contacts:write`. The Marketing preset includes both. The `mails:`, `integrations:`, `commerce:read` and `commerce:refund` permissions can be assigned but no screen currently depends on them.

</Callout>

## Owner-only areas

Some areas belong to the school owner only, no matter what permissions someone has:

- The **API keys** tab. See [API keys](/docs/settings/api-keys).
- The **Billing and plan** page. See [Billing and plan](/docs/settings/billing-and-plan).

## What you see when you lack a permission

Menu items you can't use are hidden from the sidebar. If you open a screen or take an action you don't have permission for, CourseLit tells you that you don't have permission instead of changing anything.
