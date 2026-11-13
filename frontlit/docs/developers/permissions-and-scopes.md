---
title: Permissions and scopes
description: See which permission each part of the CourseLit API needs, how permissions imply each other, and which operations an API key can never call.
nav_order: 30
---

Every operation checks the caller's permissions before it runs. API keys, OAuth access tokens and team members in the admin all use the same permission names, so a permission you give a key means exactly what it means for a team member.

A call without the permission it needs fails with `403` and the code `forbidden`.

## Permissions

| Permission | Lets the caller |
| --- | --- |
| `products:read` | Read products, sections, lessons, payment plans, customers and customer progress |
| `products:write` | Create and update products, sections, lessons and payment plans, publish or unpublish a product, cancel a customer's subscription and remove a customer's access |
| `products:delete` | Delete products |
| `communities:read` | Read communities, spaces, members, posts, comments and community plans |
| `communities:write` | Create and change communities, spaces, plans, posts and comments |
| `communities:moderate` | Change membership roles and statuses, delete posts and comments, and handle reports |
| `storefront:read` | Read website pages, blog posts, branding, themes and sales pages |
| `storefront:write` | Create and edit website pages, blog posts, branding and themes, and discard drafts |
| `storefront:publish` | Publish and unpublish pages and blog posts, and delete them |
| `contacts:read` | Read contacts, segments, tags, email sequences, templates and mailing settings |
| `contacts:write` | Create and change contacts, segments, tags, sequences, templates and mailing settings, and grant learner access to a product |
| `contacts:delete` | Delete contacts |
| `media:read` | Read the media library and where files are used |
| `media:write` | Request upload authorizations, add files to the library and edit their details |
| `media:delete` | Delete media |
| `certificates:read` | Read certificate templates |
| `certificates:write` | Create and change certificate templates |
| `analytics:read` | Read the school overview and product analytics |
| `school:read` | Read school settings, domains and custom code |
| `school:write` | Change school settings and domains |
| `commerce:manage` | Read and change the school's payment provider settings |

The permission list also contains `members:read`, `members:invite`, `members:manage`, `products:publish`, `commerce:read`, `commerce:refund`, `mails:read`, `mails:write`, `mails:send`, `billing:read`, `integrations:read` and `integrations:manage`. No API operation checks these yet, except that team management is limited to signed-in people. Granting one of them to an API key does not unlock any additional endpoints.

## Permissions that imply others

A write permission includes the matching read permission, and the stronger permissions include the weaker ones. You do not need to select both.

| Selecting | Also grants |
| --- | --- |
| `products:write` | `products:read` |
| `products:delete` | `products:write`, `products:read` |
| `communities:write` | `communities:read` |
| `communities:moderate` | `communities:write`, `communities:read` |
| `storefront:write` | `storefront:read` |
| `storefront:publish` | `storefront:write`, `storefront:read` |
| `contacts:write` | `contacts:read` |
| `contacts:delete` | `contacts:write`, `contacts:read` |
| `media:write` | `media:read` |
| `media:delete` | `media:write`, `media:read` |
| `certificates:write` | `certificates:read` |
| `school:write` | `school:read` |
| `commerce:manage` | `commerce:read` |

## Presets

When you create an API key in the admin you can start from a preset and adjust it.

| Preset | Intended for |
| --- | --- |
| Full access | Every permission |
| Content manager | Products, website, media, certificates and analytics, including publishing and deleting |
| Community manager | Communities including moderation, contact reads, media and analytics |
| Support | Product and community reads, contact changes and moderation |
| Marketing | Website, contacts, email, media and analytics |
| Read only | Every `:read` permission |
| Custom | Exactly the permissions you select |

## Operations an API key cannot call

Some operations are deliberately unavailable to API keys, because a leaked long-lived key must not be able to redirect payments, send email to your contacts or run scripts on your site. These need a signed-in person, either in the admin or through OAuth.

| Operation | Credentials accepted |
| --- | --- |
| Read or change payment provider settings | Signed-in person or OAuth |
| Change custom code injected into the learner site | Signed-in person or OAuth |
| Start an email sequence, or send a test email | Signed-in person or OAuth |
| Create, list or revoke API keys | The school owner, signed in |
| Team members, invitations and ownership | Signed-in person |
| CourseLit plan billing and the setup checklist | The school owner, signed in |
| Create or list schools, and other account-level operations | Signed-in person or OAuth |

The API reference marks, for every operation, whether an API key and an OAuth token are accepted. A request that uses a credential type an operation does not accept fails with `403`, the code `forbidden` and `details.reason` set to `credential_not_allowed`.

## OAuth scopes

An OAuth token narrows the person's permissions to its scopes.

| Scope | Keeps these permissions |
| --- | --- |
| `data:read` | Permissions ending in `:read` |
| `data:write` | Every other permission, meaning anything that creates, changes, deletes or sends |

A token needs both scopes to read and change data. An assistant that was only granted `data:read` can look at the school but not edit it.

An API key does not use scopes. Its stored permissions are the whole story.
