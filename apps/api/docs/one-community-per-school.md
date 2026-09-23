# PRD: One community per school

**Status:** Ready for implementation  
**Scope:** Community management, school-level spaces, product discussions,
pricing, learner access, community commerce, public sales experience, admin
application, storefront application, API, data model, imports, analytics, and
documentation  
**Last updated:** 2026-09-20

## Executive summary

CourseLit will provision exactly one community for every school. The community
is a school capability rather than a collection of independently created
resources: administrators configure or disable it, but they do not create,
list, or delete communities.

Community membership remains purchasable through community payment plans.
A product has two independent acquisition paths:

- **One-off purchase:** one or more active product payment plans. The
  product can be bought on its own.
- **Community access:** the product is marked **Included with community**.
  Active community members receive a derived product membership. The product
  need not have any payment plan.

A published product must have at least one path. Community-only products
cannot be checked out as a one-off. Products with plans can also be included
with community; community checkout still charges only the community plan.

Community categories and product discussion threads become **spaces**. A
space is a school-owned discussion area, not a child of the community. It
has a description, Lucide logo, featured image, auto-follow flag, and
who-can-post policy. Access is a list of unlocks: the singleton community
and/or one or more products. Each unlock may optionally name a subset of
that entity's payment plans; no plans selected means every active member of
that entity. A learner can read and participate only in spaces their active
`learner_memberships` unlock.

Enabling discussions on a course creates (or reattaches) that product's
canonical space, unlocked by the product with all-members access by default.
If the product has a space the member can access, the course viewer shows
that space as the discussion panel. Posts written there are ordinary space
posts and appear in the learner feed.

The public storefront portal has no community catalog: `/communities` is
removed and `/join` renders the singleton community's saved sales page. That
page uses the **Community** page block, which presents every active pricing
plan with the spaces that community plan includes and the community's
included products.

`learner_memberships` is the only authority for learner access. Included
products create derived product memberships under an active community
membership. Pending members receive no included products, and ending
community access revokes only the derived access while preserving direct or
otherwise independent product access.

## Problem

Treating communities as a school-owned collection creates navigation,
configuration, and entitlement complexity without a corresponding learner
benefit. A school needs one branded gathering place with multiple internal
spaces, not multiple top-level communities competing for discovery.

The community offer also needs to express two different kinds of value:

- a school-wide set of courses and downloads included with community access;
  and
- discussion spaces that can be opened by joining the community, joining a
  product, or both.

Nesting spaces under the community makes course discussions a second system
(`product_discussion_*`, per-lesson threads) that never appears in the
learner feed. Without entity unlocks and optional plan subsets, every member
of a community or product sees every attached discussion area. Without a
canonical sales route, learners must browse a community catalog even though
only one community can exist. Without space-level identity (description,
logo, featured image) and auto-follow, the authenticated workspace cannot
present distinct areas or seed a useful notification set on join.

## Goals

- Give every school exactly one durable, configurable community.
- Make `/join` the canonical public destination for discovering and buying
  community access on the learner's portal.
- Show every active community pricing plan and its complete perks before
  checkout.
- Ship a selectable **Community** page block in `@courselit/page-blocks` for
  site pages and the `/join` sales page. It shows singleton community
  details and every active payment plan with a join/buy action, using the
  same public community data as today.
- Rename `courselit-banner` to the **Product** block. It is product-only:
  no community resource type. On site pages the admin widget picks a
  product from a dropdown. On a product's owned sales page the dropdown is
  hidden and the product is the page resource.
- Replace communities' categories and product-discussion threads with durable school-level
  spaces that each carry description, logo, featured image, unlocks,
  auto-follow, and who-can-post settings.
- Let a space be unlocked by the community, by one or more products, or both.
  For each unlock, selecting no payment plans means all members of that
  entity; selecting plans restricts access to those plans.
- Derive a learner's accessible spaces from their active community and
  product `learner_memberships` matched against those unlocks.
- Replace course lesson/product discussion threads with the product's
  canonical space. Show the course-viewer discussion panel when the product
  has a space the member can access. Surface those posts in the learner feed.
- Auto-follow a space when a membership first becomes active and that
  membership unlocks the space.
- Let schools include a published product with community membership, with or
  without product payment plans. A product with no plans is community-access
  only and cannot be bought as a one-off.
- Preserve direct product access when community-derived access ends.
- Keep all learner access in `learner_memberships` and all learner commerce
  under school-owned payment-provider credentials.
- Keep learner-facing community and sales experiences fully themeable through
  `@frontlit/page-builder` primitives.

## Non-goals

- Supporting more than one community per school.
- Providing a public community catalog or community discovery marketplace.
- Configuring different included-product sets for different community plans;
  included products are school-community-wide.
- Adding per-post, per-comment, or per-learner ACLs outside membership-derived
  space access and moderator permissions.
- Keeping per-lesson discussion threads or the `product_discussion_*` tables.
- Introducing a `space` `learner_membership` type. Space access is always
  derived from community and product memberships.
- Making a staff role automatically equivalent to paid community membership.
- Replacing product payment plans, community payment plans, or the
  `learner_memberships` entitlement model.
- Moving learner checkout, invoices, subscriptions, or refunds into CourseLit
  platform billing.
- Defining paid plan upgrades, downgrades, proration, or scheduled plan changes
  beyond recording an authorized plan change on the membership.

## Success measures

- Every created or imported school resolves exactly one community.
- No learner-facing request requires a caller-selected community ID.
- Every community checkout can be traced to one displayed pricing plan and the
  spaces that plan includes.
- A learner cannot read, count, search, follow, or receive notifications for
  content in a space their active memberships do not unlock.
- A course member who can access the product's discussion space sees it in
  the course viewer and in the learner feed; per-lesson discussion threads
  no longer exist.
- Included-product activation and revocation are idempotent, and direct
  product memberships are never removed by community lifecycle events.
- `/join` displays the saved community sales page and all active plans without
  a separate community catalog.
- Community pages remain visually correct under every supported school theme.

## Actors

### School owner or community administrator

Configures the community, edits its sales page, manages school spaces and
pricing plans, decides which products are included, turns course discussions
on (creating the product's space), reviews membership requests, and
moderates activity according to staff permissions.

### Prospective member

Visits `/join`, compares all active plans and their perks, signs in when
needed, selects a plan, and completes free or paid checkout.

### Community member

Uses the authenticated learner feed, sees spaces their community membership
unlocks (and product spaces from included or direct product memberships),
and accesses included products through derived product memberships.

### Product member

Uses the course viewer. If the product has a space their membership unlocks,
they see the discussion panel there, can post when `whoCanPost` allows it,
and see those posts in the learner feed.

### Community moderator

A learner with community `role = moderate` can access and moderate every
space that has a community unlock. Staff with `communities:moderate` or
`school:admin` can moderate every space, including product-only spaces.
Moderation authority does not create a paid entitlement or financial record.

## Terminology

| Term | Meaning |
| --- | --- |
| Community | The single school-owned membership and sales resource. It does not own posts. |
| Space | A school-owned discussion area that owns posts and controls description, logo, featured image, unlocks, auto-follow, and who-can-post. |
| Unlock | A space-to-entity grant: the community and/or a product. Optional plan rows restrict that grant; no plan rows means all members of the entity. |
| Community plan | A free, one-time, installment, or subscription offer that grants community membership. |
| Included product | A published product with **Included with community** set. Active community members receive a derived product membership. |
| One-off product | A product with at least one active payment plan. It can be purchased on its own. It may also be an included product. |
| Community-only product | An included product with no active payment plan. It cannot be purchased as a one-off. |
| Direct membership | Product or community access purchased or granted independently. |
| Derived membership | Product access created under a parent community membership, with `isIncludedInPlan = true`. |
| Plan perks | For a community plan: spaces whose community unlock has no plan rows or includes that plan, plus the included products shared by every community plan. For a product: spaces that product unlocks. |
| Space follow | A learner subscription to a space. Auto-created when a membership first becomes active and that membership unlocks the space. |
| Product discussion space | The canonical space pointed at by `products.discussion_space_id`. The course-viewer panel when the member can access it. |

## Product principles

- **The school is the community boundary.** Host and authenticated school
  context select the community; clients never choose among communities.
- **Spaces are school-owned.** Community and product are unlock sources, not
  parents of posts.
- **Unlocks define ordinary member access.** A learner sees a space when an
  active community or product membership matches an unlock, and that unlock's
  plan subset is empty or includes the membership's plan.
- **Access is server-enforced.** UI hiding is supplementary; every content,
  count, search, notification, and mutation query applies space authorization.
- **Financial and derived access remain distinguishable.** Community checkout
  owns the payment record; included products are entitlements, not product
  sales.
- **Configuration is declarative.** Space unlocks, auto-follow flags, and
  product `includedWithCommunity` flags describe the desired access state,
  and reconciliation converges active memberships to it.
- **Disable rather than delete.** Community identity, content, membership, and
  financial history remain durable for the lifetime of the school.
- **The sales page is the source of truth for the offer.** `/join` shows every
  available plan and all perks before the learner commits.

## Core user journeys

### School setup

1. CourseLit creates the school, school owner account, singleton community,
   school-level `General` space with a community unlock (all members), and
   owner moderator membership atomically.
2. The community starts disabled and its saved sales page is provisioned.
3. The owner configures branding and content, creates community plans, and
   configures spaces (identity, unlocks, follow, who can post).
4. The owner enables the community after an active default plan exists.

### Configure spaces and plans

1. An authorized administrator creates, orders, edits, or removes spaces from
   the top-level Spaces workspace.
2. For each space they set description, Lucide logo, featured image, unlocks
   (community and/or products, each with an optional plan subset), whether
   new members auto-follow it, and who can post (`members` or `admin`). No
   plans selected on an unlock means all members of that entity. No unlocks
   at all means staff-only.
3. Saving the space updates access immediately for every active membership.
4. `/join` derives each community plan's spaces from community unlocks. A
   product's sales/detail view can list spaces that product unlocks.

### Include a product

1. An authorized administrator opens the product and enables **Included with
   community**.
2. If the product has no payment plans, it is community-access only: it can
   be published without a plan and cannot be bought as a one-off.
3. If the product has payment plans, it remains purchasable as a one-off and
   is also granted to active community members. The Product block shows
   both options: buy with a product plan, or join the community.
4. CourseLit reconciles derived product memberships for active community
   members. The product appears as a perk on every active community plan
   card.
5. If that product has a discussion space, included members gain it when the
   space is all-members (the default). Plan-restricted spaces stay limited
   to one-off buyers on those product plans.

### Enable course discussions

1. An authorized administrator turns on Discussions for a course.
2. CourseLit creates or reattaches a canonical space (`discussion_space_id`)
   unlocked by that product with access **all members** (no product payment
   plans selected).
3. The administrator may later restrict that unlock to a subset of **that
   product's** payment plans. Other products' plans and community plans are
   not valid on this unlock.
4. A product member whose plan is included sees the space in the course
   viewer and can post when `whoCanPost` allows it. Those posts appear in
   the learner feed.

### Join the community

1. A prospective member opens `/join` on the school host.
2. The saved community sales page renders every active plan with its price,
   description, included spaces, included products, and checkout action.
3. The learner selects a plan and authenticates if necessary.
4. CourseLit creates or resumes checkout for that exact plan.
5. Free auto-approved or successfully paid access activates the community
   membership and its included-product memberships. Manual approval leaves
   access pending until an administrator approves it. Activation also
   auto-follows spaces whose follow flag is on and that this membership
   unlocks (community unlock matching the selected plan, and product spaces
   unlocked by newly granted included memberships).
6. The learner enters `/dashboard` and sees every space their active
   memberships unlock.

### End or change access

1. A community membership may end through leave, rejection, expiry, payment
   failure, refund, dispute, or an authorized admin action.
2. CourseLit updates the parent membership and its derived product
   memberships without touching independent product memberships.
3. If an authorized plan change occurs, accessible spaces update immediately
   and the same community membership remains the durable relationship.
   Follower rows are removed only for spaces the member can no longer
   access through any remaining membership.

## Requirement catalog

| ID | Requirement |
| --- | --- |
| COM-001 | Every school has exactly one community, provisioned with the school. |
| COM-002 | The community is always enabled by default and cannot be independently created, deleted, or disabled. |
| COM-003 | Community configuration (name, description, banner, artwork, joining question, auto-approval) remains editable by administrators. |
| ROUTE-001 | `/communities` does not exist in the storefront portal. |
| ROUTE-002 | `/join` renders the singleton community's saved sales page. |
| SALES-001 | `/join` uses the **Community** page block and renders every active community plan rather than only the default. |
| SALES-002 | Each community plan card shows formatted pricing, the spaces that plan includes, all shared included products, and a plan-specific checkout action. |
| SALES-003 | The **Product** block renders every active product plan when the product is one-off purchasable. |
| SALES-004 | When a product is both one-off purchasable and **Included with community**, the Product block shows both acquisition options: product-plan checkout and community membership. |
| SALES-005 | A community-only product's Product block shows only the community membership option. A one-off-only product shows only product plans. |
| BLOCK-001 | A **Community** page block in `packages/page-blocks` is selectable in the page builder, allowed on site pages and the community sales page, and reads the singleton community public details. |
| BLOCK-002 | `courselit-banner` is renamed to **Product** (`courselit-product`), drops community support, and is product-only. On site pages the admin widget shows a product dropdown; on a product sales page the dropdown is hidden and the product is assumed from the page. |
| SPACE-001 | Categories and product-discussion threads are replaced everywhere by durable school-level spaces. |
| SPACE-002 | Every post belongs to one space. Spaces have no `community_id`. |
| SPACE-003 | Each space stores description, Lucide logo name, optional featured image, a follow flag, and `whoCanPost` (`members` or `admin`). |
| SPACE-004 | A space is unlocked by the community and/or products. For each unlock, no selected plans means all members of that entity; selected plans restrict access to those plans. No unlocks means staff-only. |
| SPACE-005 | Ordinary learner access is the union of spaces unlocked by the caller's active community and product `learner_memberships`. |
| SPACE-006 | Space authorization applies to reads, writes, counts, search, reports, subscriptions, follows, and notifications. |
| SPACE-007 | On membership activation, CourseLit auto-follows spaces whose follow flag is on and that membership unlocks. |
| SPACE-008 | Members can follow or unfollow any accessible space. Followers receive space-level notifications; unfollowing stops those notifications immediately. |
| SPACE-009 | `whoCanPost = members` lets anyone with read access post except a learner whose only unlocking membership is a community `comment` role. `whoCanPost = admin` limits new posts to authorized staff, plus community moderators on spaces that have a community unlock. |
| SPACE-010 | The authenticated learner feed is at `/dashboard`, with a filtered space feed at `/dashboard/s/<spaceId>`, and uses `GET /v1/learner/feed`. The aggregate feed is the union of posts in spaces the caller can read. |
| DISC-001 | Enabling discussions on a course creates or reattaches a canonical space unlocked by that product. |
| DISC-002 | If the product has a space the member can access, the course viewer shows that space as the discussion panel. |
| DISC-003 | Per-lesson discussion threads and `product_discussion_*` tables are not part of V1. |
| DISC-004 | A product's space defaults to all product members (no payment plans selected on that product unlock). It may be restricted to a subset of **that product's** payment plans. |
| PROD-001 | **Included with community** is a product-level flag, not a payment-plan kind or plan flag. |
| PROD-002 | A published product must have at least one acquisition path: an active payment plan (one-off) and/or **Included with community**. |
| PROD-003 | A product with **Included with community** and no active payment plan is community-access only and cannot be purchased as a one-off. |
| PROD-004 | Published included products are granted to every active community membership that has a community plan. |
| MEM-001 | `learner_memberships` is the sole authority for community and product access. |
| MEM-002 | Included products use derived child memberships linked to the parent community membership. |
| MEM-003 | Pending community or product access grants neither spaces, auto-follows, nor included products. |
| MEM-004 | Revoking community access preserves independent product access. |
| MEM-005 | A planless moderator or staff membership grants no included products. |
| SEC-001 | All lookups are school-scoped and inaccessible spaces return `404` to learners. |
| SEC-002 | Product unlock plan subsets match only direct product memberships. Included memberships never compare their community `payment_plan_id` to a product plan ID. |
| PERM-001 | Space admin CRUD uses existing `communities:write` (or `school:admin`). Moderation of every space, including product-only, uses `communities:moderate`. No new `spaces:*` permission keys. |
| REP-001 | All space reports live under `/v1/spaces/reports` and the admin Spaces reports queue. `/community/reports` is not a V1 surface. |
| THEME-001 | All changed learner-facing UI uses page-builder primitives and honors the active theme. |

## Functional requirements

### Community lifecycle

- A school always has one community row, created in the school-creation
  transaction.
- The row starts disabled. The owner configures it, creates a default
  community payment plan, and then enables it.
- Disabling is the reversible way to remove the community from `/join` and
  block new checkout. Existing active members retain authenticated access;
  disabling does not cancel subscriptions, rewrite membership status, or
  revoke included products. There is no community delete operation.
- The row keeps an internal UUID and a public ID because memberships, media
  references, sales pages, checkout history, and notifications need a stable
  resource identity. Posts belong to spaces, not to the community row.
- Client-facing routes are singular and do not ask the client to choose a
  community ID. The API resolves the community from the server-verified
  school context.
- New defaults are: name `<school name> Community`, slug `community`, one
  school-level `General` space (logo `MessagesSquare`, empty description, no
  featured image, community unlock with no plan rows, `follow = true`,
  `whoCanPost = members`), `enabled = false`, and
  `autoAcceptMembers = true`. A later school rename does not overwrite a
  customized community name.
- School creation also creates an active `moderate` community
  `learner_membership` for the owner school account. This is an explicit
  bootstrap grant, not a rule that all staff automatically receive community
  access.

### Product acquisition and included-product configuration

A product is acquired in two independent ways. `storefront_plans.kind` is
unchanged (`free | one_time | subscription | installment`). There is no
included-with-community plan kind.

- **One-off purchase.** The product has one or more active payment plans.
  Learners can check out those plans on the product. Public buy actions and
  product checkout exist only while at least one product plan is active.
- **Community access.** The product has `includedWithCommunity: boolean`
  (default `false`) on the **product**, not on a plan. When true, every
  active community membership that has a community payment plan receives a
  derived product membership. Community checkout charges only the community
  plan.

Publish and stay-published require at least one acquisition path:

- active payment plan, or
- `includedWithCommunity = true`.

Publishing with neither fails (`payment_plan_required` is generalized to
"no acquisition path"). Clearing the last path on a published product is
rejected until the product is unpublished or another path is added.

Community-only (included, no active plans):

- can be published;
- has no product checkout, no product buy CTA, and is not sold as a
  one-off;
- still appears as a perk on `/join`;
- typically `privacy = unlisted` so it is absent from the public product
  catalog.

One-off plus community (included, and active plans):

- can be bought at each plan's own price;
- is also granted to active community members;
- community members are product members **without** a product payment plan;
- the Product block shows **both** options: every active product plan
  (one-off checkout) and community membership (every active community plan,
  same perks as `/join`). Each card starts checkout for that exact plan and
  resource. The community option is omitted while the community is disabled.

Draft products and unpublished products are not granted, even if the flag is
on. Returning the product to draft or turning the flag off expires derived
memberships. Adding or archiving product plans does not by itself add or
remove the community grant.

Community plan responses do not accept or persist `includedProducts`.
Community detail and checkout responses expose a derived list of included
product summaries.

The included-product set is shared by every community plan because it is
defined by product flags. Plan-specific space perks are the spaces
whose **community** unlock has no plan rows or contains that community plan.
Product-only spaces are not community plan perks; they appear when the
learner has the matching product membership (direct or included). On
`/join`, each pricing card repeats the shared included products and lists
only the community-unlocked spaces that plan includes.

### Spaces and unlocks

- Rename the category concept completely to **space** in database columns,
  service names, API fields, validation errors, audit events, UI copy, query
  parameters, and documentation. Do not retain category aliases.
- A school owns zero or more ordered spaces. Each space has a stable public
  ID, name, slug, description, Lucide logo name, optional featured image,
  auto-follow flag, who-can-post policy, position, and timestamps. It has no
  `community_id`.
- Every post belongs to exactly one space by internal foreign key. `All` is a
  feed filter over the caller's accessible spaces, not a stored space.
- Space settings are:

  | Setting | Type | Behavior |
  | --- | --- | --- |
  | Description | text | Shown in admin, learner navigation, space headers, and perk lists. Empty is allowed. |
  | Logo | Lucide icon name | PascalCase `lucide-react` export stored as text, for example `MessagesSquare`. The admin editor presents a Lucide icon picker. Missing or unknown names fall back to `MessagesSquare` in the UI. |
  | Featured image | media | Optional `MediaRef` using the same picker and reference lifecycle as community and product featured images. Unsplash selections must not be recorded in the media library. |
  | Access | unlocks | Zero or more entity grants: the singleton community and/or products. For each unlock, selecting no payment plans means every active member of that entity (a product space defaults to all product members). Selecting plans restricts that unlock to members whose recorded plan for **that same entity** is in the list — a product unlock may only name that product's payment plans. No unlocks at all means staff-only. |
  | Follow | boolean | When true, CourseLit automatically follows the space when a learner's membership first becomes active and that membership unlocks the space. |
  | Who can post | `members` \| `admin` | `members` (default) lets anyone with read access create posts, except a learner whose only unlocking membership is a community membership with `role = comment`. Product members have `role = null` and may post. `admin` lets authorized staff create posts, plus community `role = moderate` on spaces that have a community unlock. Product-only spaces: staff only. Ordinary members with access may still read, comment, and react. The setting applies to creating new posts; editing and deleting follow existing author and moderator rules. |

- Access is configured on the space, not on the payment plan. Community and
  product plan create/update do not accept `spaceIds`. Saving a space
  replaces that space's unlock and unlock-plan rows in the same transaction.
  Editing access changes visibility immediately.
- An ordinary learner obtains accessible spaces by matching active
  `learner_memberships` to `space_unlocks`. A community `comment` or `post`
  membership must record a valid community plan. Product memberships use the
  product's plan (direct) or the included-product rule below.
- A community unlock with no plan rows appears as a perk on every active
  community plan. A community unlock with selected plans appears only on
  those plans. Product-only spaces are not community plan perks.
- Archiving a plan prevents new checkout and leaves existing unlock-plan
  rows in place so active members already on that plan keep their spaces.
  Archived plans stay selected until an administrator removes them; the
  admin picker offers active plans for new assignments.
- Remove the planless learner join flow. Free community access still selects
  a free community plan and goes through checkout so the membership has a
  deterministic plan for community unlocks.
- A community membership with `role = 'moderate'` may access every space
  that has a community unlock even when the bootstrap membership has no
  payment plan. It does not grant product-only spaces. Authorized staff may
  moderate every space without a paid entitlement.
- Switching a learner to another community or product plan changes
  accessible spaces immediately. Follower rows for spaces they can no longer
  access through any membership are removed. Newly accessible auto-follow
  spaces are not followed automatically; auto-follow runs only when a
  membership first becomes active.
- Auto-follow is idempotent. It applies only to spaces that membership
  unlocks. Planless moderator bootstrap memberships auto-follow
  community-unlocked spaces that have no plan restriction, not product-only
  spaces they can see solely because of staff moderation. Toggling follow
  does not retroactively follow or unfollow existing members. Creating a
  space after members have joined does not auto-follow those members.
- Members may follow or unfollow any accessible space after joining. The
  follow API returns `404` for an inaccessible or cross-school space.

### Space follow and notifications

Following is a membership-side subscription to a space, not an entitlement.
It applies to community-unlocked and product-unlocked spaces the same way,
including the course-viewer discussion space.

- **Follow** inserts a `space_followers` row. The member then receives
  in-app notifications for new posts in that space (`space_post_created`),
  excluding posts they authored.
- **Unfollow** deletes that row. They stop receiving space-level
  notifications for that space immediately. Existing notifications stay in
  their inbox.
- Auto-follow on membership activation (when the space's Follow setting is
  on) creates the same follower row. The member can unfollow afterwards.
- Losing all unlocking memberships deletes follower rows. Notification
  delivery still re-checks current space access, so a stale follower cannot
  leak locked content.
- Post-level subscribers remain for comments and replies on a specific post
  (`space_comment_created`, `space_reply_created`). Reacting notifies the
  content author (`space_post_liked`, `space_comment_liked`,
  `space_reply_liked`). These do not require following the space.
- Creating a post auto-subscribes the author to that post. Following a
  space does not auto-subscribe the member to every existing post.
- Learner notification preferences can mute a type (for example
  `space_post_created`) without unfollowing. Delivery honors both the
  follower row and the preference.
- Use the space-prefixed notification types above. Notification `href` values
  use the canonical post-detail route and retain the post's space context where
  useful.

Do not notify the actor who caused the event. Do not notify pending,
rejected, or expired members.

Creating a post requires read access and a passing `whoCanPost` check. A
caller who can read but cannot post receives `403`; a caller without access
receives `404`. Comments, reactions, and follows are not restricted by
`whoCanPost`. Space authorization is enforced in API queries for feeds, post
detail, comments, reactions, subscriptions, follows, reports, notifications,
and the course-viewer discussion panel. Hidden posts must not leak through
counts, search, direct IDs, or notification payloads.

Deleting a space requires the administrator to choose another space when
posts exist. The transaction moves those posts, then removes unlocks,
follower rows, and the featured-image media reference. Products pointing at
the deleted space as `discussion_space_id` are cleared and discussions
turned off.

### Product discussion spaces

- The `product_discussion_*` tables and per-lesson discussion threads are
  not part of V1. Course discussion is a space.
- Only `kind = 'course'` exposes the Discussions switch. Turning it on
  creates or reattaches `products.discussion_space_id`: name from the
  product title, slug from the product slug (namespaced on collision), logo
  `MessagesSquare`, `follow = true`, `whoCanPost = members`, and one product
  unlock whose access defaults to **all members** (no `space_unlock_plans`
  rows).
- Turning discussions off hides the course-viewer panel and does not delete
  the space or its posts. Turning it on again reattaches the same space when
  it still exists.
- That product unlock may later be restricted to a subset of **that
  product's** payment plans. The picker lists only this product's plans.
  Empty selection (or clearing every plan) returns the space to all product
  members. Community plans and other products' plans are rejected.
- Other school spaces may also unlock this product. They appear in the
  learner feed. The course-viewer panel is only `discussion_space_id`.
- The course viewer shows the discussion panel when `discussions` is true,
  `discussion_space_id` is set, **and** the caller can access that space. If
  the product has no space the member can access, the panel is hidden.
  Preview tokens follow existing preview rules (read-only, no post).
- Posts created in that panel are `space_posts` and appear in the
  authenticated learner feed.

### Included-product matching for product unlocks

The derived product membership stores the purchased **community** plan on
`payment_plan_id` for financial tracing. That value is **never** compared to
`space_unlock_plans.payment_plan_id` for a product unlock. Community plan
public IDs and product plan public IDs are different ID spaces.

Predicate for a product unlock:

```text
active learner_membership
  AND entity_type = 'product'
  AND entity_id = this product's public id
  AND (
    unlock has no space_unlock_plans rows
    OR (
      is_included_in_plan = false
      AND payment_plan_id IN selected product plan public ids
    )
  )
```

- All-members (no plan rows): included members and one-off members both get
  the space.
- Plan subset: **only direct** product members (`is_included_in_plan =
  false`) whose recorded product plan is in the set. Included members never
  match a subset.
- Community-only products have no product plans, so the subset picker is
  empty and the space stays all-members.

### Access lifecycle

```text
active community learner_membership
    |
    +-- included product learner_membership
    |      parentMembershipId = community membership UUID
    |      isIncludedInPlan = true
    |      paymentPlanId = purchased community plan public ID
    |
    +-- included product learner_membership
           parentMembershipId = community membership UUID
           isIncludedInPlan = true
           paymentPlanId = purchased community plan public ID
```

- Free auto-approved checkout, successful paid checkout/webhook, subscription
  recovery, and manual approval all run the same idempotent bundle sync after
  the parent community membership becomes active.
- Pending or rejected community memberships do not grant products.
- A moderator or staff bootstrap membership without a community
  `paymentPlanId` does not grant included products. Included products require
  an active parent membership tied to a community plan.
- Leaving, rejection after prior activation, payment failure, expiry, refund,
  or dispute changes the parent status and applies the same status to its
  derived child memberships.
- Revocation selects children by `parentMembershipId`, not merely by payment
  plan ID. This prevents one community transaction from affecting unrelated
  access.
- Authorization succeeds when any active product membership exists. An
  expired derived membership must not mask an active direct membership.
- Changing product `includedWithCommunity` flags reconciles all active
  community memberships:
  newly included products are granted, removed products' derived memberships
  are expired, and unchanged rows are left intact. The operation is
  idempotent and processed in bounded batches so a large community does not
  make a plan update request unbounded.
- The normal activation and authorization paths also call the idempotent sync
  helper, making access converge even if a background reconciliation is
  retried or delayed.

### Access matrix

| Actor or state | `/join` | Spaces | Included products |
| --- | --- | --- | --- |
| Anonymous | View all active plans and perks | None | None |
| Pending or rejected member | View offer | None | None |
| Active community `comment` member | View offer | Community-unlocked spaces matching the plan (or all-members community unlocks); read, react, comment; no post | Active derived memberships, and those products' spaces under the included-product rule |
| Active community `post` member | View offer | Same spaces; may post where `whoCanPost = members` | Active derived memberships and their spaces |
| Active community `moderate` member with a plan | View offer | Every community-unlocked space plus moderation; product-only spaces only if a product membership unlocks them | Active derived memberships |
| Active community `moderate` member without a plan | View offer | Every community-unlocked space plus moderation | None from community access |
| Active product member | n/a | Spaces that product unlocks (all-members or selected product plans); course-viewer panel if the canonical space is accessible | n/a (they hold the product) |
| Authorized staff moderator | View offer | Every space for moderation | No product access unless separately entitled |

## Data requirements

### `communities`

The table stores one row per school and retains the stable public ID, display
settings, saved sales-page ownership, media, admission settings,
internal resource slug, and timestamps.

- A unique index on `school_id` enforces the singleton.
- Spaces are school-owned; the community row has no category array and no
  space list.
- The community is always enabled by default and cannot be turned off.
- The slug identifies the saved sales resource internally. Learners reach it
  through `/join`, and authenticated APIs resolve the community by school.
- `communities.school_id` is the relationship source of truth; `schools` does
  not duplicate a `community_id` pointer.

### `storefront_plans`

- `kind` remains `'free' | 'one_time' | 'subscription' | 'installment'`.
  There is no included-with-community kind and no
  `included_with_community` column on plans.
- Product plan DTOs and create/update inputs do not include the community
  flag. Community plan inputs do not expose it either.
- Community plans do not persist included-product ID arrays; their product
  perks are derived from products with `included_with_community = true`.
- Active product plans are the one-off purchase offers. Zero active plans
  means the product cannot be bought as a one-off.

### `products`

- `included_with_community boolean not null default false`.
- Retain `discussions boolean not null default false`. Add
  `discussion_space_id` uuid FK `spaces` on delete set null, nullable. Only
  courses use the discussions switch. The FK identifies the course-viewer
  panel; access is still `space_unlocks`.
- Publish is allowed when `included_with_community` is true even if there
  are no active plans. Publish with the flag false and no active plans
  remains invalid.

### `spaces`

School-scoped. No `community_id`.

- `id` UUID primary key and globally unique `public_id`;
- `school_id` FK schools cascade;
- `name`, school-scoped unique `slug`, `description` text not null default
  `''`, `logo` text not null (Lucide icon name, default `MessagesSquare`),
  optional `featured_image` jsonb `MediaRef`, `follow` boolean not null
  default `false`, `who_can_post` text not null default `'members'`
  constrained to `'members' | 'admin'`, and an integer `position`;
- `created_at` and `updated_at`;
- unique `(school_id, slug)` and listing index `(school_id, position, id)`.

The provisioned `General` space is created with `logo = 'MessagesSquare'`,
empty description, no featured image, `follow = true`,
`who_can_post = 'members'`, and one community unlock with no plan rows.
Administrator-created spaces default to `logo = 'MessagesSquare'`, empty
description, no featured image, `follow = false`, `who_can_post = 'members'`,
and no unlocks (staff-only until an unlock is added).

Names need not be unique. Featured-image media references follow the same
attach/detach cleanup as other featured images.

### `space_unlocks`

One row per `(space, entity)`.

- `id` UUID primary key;
- `school_id` FK schools cascade;
- `space_id` FK spaces cascade;
- `entity_type` `'community' | 'product'`;
- `entity_id` text containing the public ID of the community or product;
- `created_at`;
- check: `entity_type` is `'community'` or `'product'`;
- unique `(space_id, entity_type, entity_id)`;
- lookup index on `(school_id, entity_type, entity_id)`;
- entity and school ownership are validated by the service because the
  polymorphic `entity_id` cannot use a conditional foreign key.

### `space_unlock_plans`

Optional plan subset for one unlock. Zero rows = all members of that entity.

- `unlock_id` FK space_unlocks cascade;
- `school_id` FK schools cascade;
- `payment_plan_id` FK storefront_plans restrict, must belong to the unlock's
  entity and school;
- unique `(unlock_id, payment_plan_id)`.

Space create/update and its unlock plus plan rows are one transaction.
Community and product plan create/update do not write these rows. Service
validation enforces tenant and entity-type alignment.

An ordinary member accesses a space when any active membership matches an
unlock and that unlock has no plan rows, or the membership's plan is among
the selected plans (with the included-product rule for product unlocks).
Feed authorization applies that predicate in the database before pagination
and counts.

### `space_followers`

- `id` UUID primary key;
- `school_id` and `space_id` FKs cascade;
- `school_account_id` FK cascade;
- `created_at`;
- unique `(space_id, school_account_id)` and lookup
  `(school_id, school_account_id, space_id)`.

Inserted idempotently on membership activation for accessible auto-follow
spaces, and by the learner follow API. Deleted when the member loses **all**
unlocking memberships, leaves, or unfollows. Kept if another entity still
unlocks the space. A follower row is not an entitlement.

### `space_posts` (and comments, reactions, post subscribers, reports)

Every post stores a non-null `space_id` referencing `spaces.id` using delete
restrict. There is no `community_id` on content tables. A feed index begins
with `(school_id, space_id, pinned, created_at, id)`. Post DTOs return a
compact `space` object containing ID, name, slug, description, and logo.

Rename `community_posts`, `community_comments`, `community_reactions`,
`community_post_subscribers`, and `community_reports` accordingly. Drop
`product_discussion_*`.

### `learner_memberships`

This table is the only source of community and product access.

- A direct community membership has `entity_type = 'community'`, the singleton
  community public ID in `entity_id`, and one of `comment`, `post`, or
  `moderate` in `role`.
- Non-moderator active community memberships have a non-null
  `payment_plan_id` containing the selected community plan's public ID. That
  plan is matched against community unlocks even if the plan is later
  archived for new sales. Direct product memberships (`is_included_in_plan =
  false`) match product unlock plan subsets against their product plan.
  Included children keep the community plan ID for financial tracing only
  and match all-members product unlocks; they never match a product plan
  subset.
- A bundled product membership has `entity_type = 'product'`,
  `is_included_in_plan = true`, and the parent community membership's internal
  UUID in `parent_membership_id`.
- Enforce partial uniqueness rules that allow one direct product membership
  and one child membership per parent to coexist.
- Add/retain indexes for `(school_id, entity_type, entity_id, status)` and
  `(parent_membership_id, status)` because singleton membership listing,
  authorization, and bundle reconciliation depend on them.
- Tighten the shape check so roles are present only for community memberships
  and included rows are product memberships with a parent.

There is no separate `community_memberships` table. Status, joining reason,
rejection reason, access level, and payment-plan relationship belong on the
community `learner_membership`; a second table would create two authorities.

Community checkout attempts, payments, invoices, and subscriptions remain
separate from platform billing and continue to use school-owned payment
provider credentials. Their `membership_id` should reference the community
`learner_memberships.id` where a foreign key is practical without deleting
financial history.

### Database delivery

This platform version has no production deployment, so the V1 schema is
defined directly in the baseline schema and generated snapshot without
compatibility migrations. Development and test databases are reset and the
baseline is re-applied.

## API contract

Community endpoints are school-scoped and singular. Spaces are a school-level
resource. Resource-specific post, comment, reaction, report, membership,
plan, and space IDs remain in their own routes where needed.

| Surface | Required endpoint shape |
| --- | --- |
| Admin community | `GET/PATCH /v1/community` |
| Admin spaces | see **Spaces HTTP contract** below |
| Admin members | `/v1/community/members/...` |
| Admin posts | `/v1/spaces/:spaceId/posts`, `/v1/posts/:postId` |
| Admin space reports | `GET /v1/spaces/reports`, `PATCH /v1/space-reports/:reportId` |
| Community plans | `/v1/community/plans/...` |
| Learner community | `/v1/learner/community` |
| Learner feed | `GET /v1/learner/feed` |
| Learner spaces | `GET /v1/learner/spaces` |
| Learner space follow | `PUT`/`DELETE /v1/learner/spaces/:spaceId/follow` |
| Learner leave and checkout | `/v1/learner/community/...` |
| Learner course discussion | the product's canonical space via space post APIs; no `/v1/learner/products/:id/discussions` |
| Public community | `GET /v1/public/community` |
| Public plans | `/v1/public/community/plans` |

Contract requirements are:

- no community list/create/delete schemas or routes;
- no client-supplied `communityId` where school context identifies the
  singleton;
- `spaceSchema` and `spaceId` (public ID) as specified in **Spaces HTTP
  contract**;
- product update accepts `discussions: boolean` on courses; enabling it
  creates or reattaches `discussionSpaceId`. Product DTOs include
  `discussionSpaceId`;
- no `product_discussion_*` comment/reply/like/report routes;
- a community membership projection sourced from `learner_memberships` and
  using the `comment`, `post`, and `moderate` access vocabulary;
- `includedWithCommunity` on product schemas and product create/update
  bodies, not on storefront plan inputs;
- no `includedProducts` field in payment-plan inputs;
- no `spaceIds` on community-plan or product-plan create/update inputs; space
  access is written only through space `unlocks`. Ordered space summaries
  still appear on community-plan DTOs, derived from community unlocks that
  include that plan (or have no plan rows);
- a compact included-product summary on the community response, containing
  at least product ID, title, kind, slug, featured image, and whether it
  is community-only (no active product plans);
- a public sales payload in which each active community plan contains a
  structured `perks` object with the spaces that plan includes and the
  shared included products; do not flatten these into presentation-only
  strings;
- `404` from the public community endpoint while the community is disabled;
  and
- checkout-session creation that requires only the community plan ID, or an
  explicit `resourceType: "community"`, and never a client-selected community
  ID.

Plural community collections and community-ID route aliases are not part of
the V1 contract. MCP parity annotations are updated where an affected contract
operation is represented there.

`GET /v1/learner/feed` is the only learner post-list endpoint. An optional
`spaceId` query filters to one accessible space; omitting it unions every
space the caller can read. If the learner supplies an inaccessible or
cross-school space, return `404` so the API does not disclose its existence.
Create a post with `POST /v1/learner/spaces/:spaceId/posts`. Admin callers
with `communities:write` or `school:admin` may manage every space in the
school. Moderators with `communities:moderate` or `school:admin` may
moderate every space, including product-only spaces.

### Spaces HTTP contract

School-scoped. No `communityId` in the path. `:spaceId` is the space public
ID. Cross-school IDs return `404`, not `403`.

**Admin (`communities:write` or `school:admin`)**

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| `GET` | `/v1/spaces` | — | `200 { items: AdminSpace[] }` ordered by `position` |
| `POST` | `/v1/spaces` | create body | `201 AdminSpace` |
| `GET` | `/v1/spaces/:spaceId` | — | `200 AdminSpace` |
| `PATCH` | `/v1/spaces/:spaceId` | patch body | `200 AdminSpace` |
| `PUT` | `/v1/spaces/order` | `{ spaceIds: string[] }` | `200 { items: AdminSpace[] }` |
| `DELETE` | `/v1/spaces/:spaceId` | `{ destinationSpaceId?: string }` | `200 { id: string }` |

Create body:

```ts
{
  name: string;                 // required, 1–100 chars
  description?: string;         // default ""
  logo?: string;                // Lucide PascalCase name, default "MessagesSquare"
  featuredImage?: MediaRef | null;
  unlocks?: Array<{
    entityType: "community" | "product";
    entityId?: string;          // omit for community; product public ID required for product
    planIds?: string[];         // default []; empty = all members of that entity
  }>;
  follow?: boolean;             // default false
  whoCanPost?: "members" | "admin"; // default "members"
}
```

Patch body is the same fields, all optional. Sending `unlocks` replaces the
entire unlock set in one transaction. `name` cannot be empty. Slug is
generated from `name` on create, unique per school, and does not change on
rename. `position` is assigned `max(position)+1` on create and is only
changed through `PUT /v1/spaces/order`.

`PUT /v1/spaces/order` must send every school space public ID exactly once.
Missing, extra, or duplicate IDs return `400` with
`reason: "incomplete_order"`.

Delete:

- The last remaining space cannot be deleted (`400`, `reason: "last_space"`).
- If the space has posts, `destinationSpaceId` is required (`400`,
  `reason: "destination_required"`). The destination must be another space
  in the same school (`404` if missing/cross-school;
  `400`, `reason: "destination_same"` if it is the deleted space). The
  transaction moves posts, then deletes unlocks, followers, and the space.
- If the space has no posts, omit `destinationSpaceId`.
- Products with `discussion_space_id` pointing at the deleted space are
  cleared and `discussions` set false.

Admin space DTO includes settings plus ordered unlock summaries (entity
type, entity id/name, selected plans). `409` with `reason: "slug_taken"`
only if a future slug field is added; V1 create retries a namespaced slug
instead of failing.

**Learner**

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| `GET` | `/v1/learner/spaces` | — | `200 { items: LearnerSpace[] }` accessible spaces, `position` order |
| `PUT` | `/v1/learner/spaces/:spaceId/follow` | — | `200 { followed: true }` |
| `DELETE` | `/v1/learner/spaces/:spaceId/follow` | — | `200 { followed: false }` |
| `POST` | `/v1/learner/spaces/:spaceId/posts` | post body | `201` post |

`GET /v1/learner/spaces` is the nav/composer list, not the post feed.
Learner space summaries omit unlock plan IDs, include `whoCanPost` and
`followed`.

Follow is a follower-row resource:

- `PUT` inserts the row if missing and returns `{ followed: true }`. Already
  following is **idempotent `200`**, not `409`.
- `DELETE` removes the row if present and returns `{ followed: false }`.
  Not currently following is **idempotent `200`**, not `404`.
- Either method on a space the caller cannot access, or a cross-school ID,
  returns `404` (do not disclose existence). Unauthenticated: `401`.
- `whoCanPost` does not affect follow.

**Shared errors**

| Status | When |
| --- | --- |
| `400` | validation (`invalid_unlock`, `invalid_logo`, `invalid_who_can_post`, `last_space`, `destination_required`, `destination_same`, `incomplete_order`) |
| `401` | no session |
| `403` | authenticated without `communities:write` / `communities:moderate` / `school:admin` as required by the route |
| `404` | unknown or cross-school space; learner without access |

Learners never receive `403` for a hidden space.

**Reports (unified, all spaces)**

| Method | Path | Who | Success |
| --- | --- | --- | --- |
| `GET` | `/v1/spaces/reports` | `communities:moderate` or `school:admin` | `200` cursor page of reports from every space |
| `PATCH` | `/v1/space-reports/:reportId` | same | `200` updated report |
| `POST` | `/v1/learner/spaces/:spaceId/reports` | learner with access | `201` report |

There is no `/v1/community/reports` or `/v1/products/:id/discussions/reports`
in V1. Optional query `spaceId` on the admin list filters to one space.

### Staff permissions

Do not add `spaces:*` keys. Reuse the existing catalog:

| Action | Permission |
| --- | --- |
| List/read spaces in admin | `communities:read` (implied by write/moderate) or `school:admin` |
| Create, update, reorder, delete spaces and unlocks | `communities:write` or `school:admin` |
| List/resolve reports, hide/delete posts in **any** space (including product-only) | `communities:moderate` or `school:admin` |
| **Included with community**, course Discussions switch | `products:write` or `school:admin` |
| Community settings, plans, members | existing `communities:write` / `communities:read` |

`communities:moderate` implies write and read, as today. A learner community
membership with `role = moderate` still only unlocks **community-unlocked**
spaces; it does not grant product-only spaces or staff permissions.

## Service and authorization requirements

### Singleton lookup and provisioning

Admin, learner, public, checkout, sales-page, and notification services resolve
the singleton through one school-scoped community lookup. Every lookup combines
the server-resolved school ID with the resource lookup; public IDs alone never
select a cross-school community.

School provisioning creates, in one transaction:

1. the school and owner school account;
2. the singleton disabled community;
3. its default school-level `General` space and a community unlock with no
   plan rows;
4. the owner's active `moderate` community learner membership;
5. the community sales-page provisioning job; and
6. audit events for the school, community, space, unlock, and bootstrap
   membership.

The transaction and unique school index make retries safe. Existing-school
repair code may insert a missing singleton, but it must treat a second row as
an invariant violation rather than picking one silently.

### Community domain

The community domain:

- has no collection list, create, delete, or community-name cursor behavior;
- uses school-scoped learner-membership queries for counts, moderation checks,
  member updates, joining, leaving, and authorization;
- does not own posts or space records;
- paginates members;
- enforces last-moderator protection using active community memberships with
  `role = 'moderate'` plus explicit staff moderation rules; and
- preserves sales-page provisioning behavior.

### Space domain

The space domain:

- is school-scoped and independent of the community row;
- loads spaces by stable ID and validates Lucide logo names, featured-image
  media references, unlocks (community singleton and same-school products),
  unlock plan IDs (must belong to that entity), and `whoCanPost`;
- resolves the actor's accessible spaces from active community and product
  memberships before selecting or mutating posts, comments, reactions,
  subscriptions, follows, or reports;
- enforces `whoCanPost` on post create (`403` when the caller can read the
  space but cannot post; `404` when they cannot access it);
- auto-follows eligible spaces when a community or product membership
  (including a new included-product child) becomes active;
- paginates posts, comments, and reports;
- emits notification links using singular admin and learner routes; and
- preserves media reference cleanup, safe space deletion, and audit events.

Feed queries must apply the space-access predicate (an active membership
matches an unlock, and that unlock has no plan rows or includes the matching
plan; every space for authorized staff) before pagination and counts are
calculated. Filtering an already-loaded page in application code is not
sufficient: it produces short pages and can leak hidden post counts.
Notification creation and delivery must perform the same authorization
check, and links use `space=<space public ID>` only when useful for restoring
feed state. Space-level new-post notifications go to current followers who
still have access.

Enabling `discussions` on a course is a space-domain operation: create or
reattach the canonical space and product unlock. The course viewer loads
that space through the same authorization as the feed.

### Included-product service

One shared, idempotent domain operation is used by community commerce and
product-plan changes. It:

1. query published products with `includedWithCommunity` for the school;
2. upsert one derived product membership per active community parent that has
   a community payment plan;
3. update the child `paymentPlanId` when the parent changes community plan;
4. expire derived children that are no longer in the desired set;
5. never mutate direct product memberships;
6. emit post-membership activity, notifications, or email-sequence hooks only
   when a child first transitions to active; and
7. auto-follow product spaces that the new child membership unlocks when
   those spaces have `follow = true`.

Community checkout and lifecycle operations use this shared operation rather
than reading a stored product-ID array. Revocation starts from the parent
community membership and cascades status to its derived children; it does not
perform a broad payment-plan-ID cleanup.

Product plan create/update/archive and product publish/unpublish/delete paths
must enqueue a bounded reconciliation whenever bundle eligibility changes.
Use a durable, idempotent job keyed by school, product, and configuration
revision; process memberships in stable UUID pages. A retry must converge on
the same rows without sending duplicate lifecycle events.

### Community plans and commerce

Community plans and school-owned learner-commerce records remain separate from
platform billing. Community plan services:

- do not accept or persist included-product arrays;
- do not accept or persist `spaceIds`; space access is owned by space
  unlocks;
- enforce pricing-shape, default-plan, archive, tenant, and provider rules;
  and
- project the community's derived included-product summaries alongside the
  community or checkout view. The public sales projection may repeat the
  shared product summaries inside each plan's structured perks for direct
  rendering, but they are not persisted per plan. Each plan's space perks are
  derived at read time from spaces whose community unlock has no plan rows
  or contains that plan.

Community checkout fulfillment remains responsible for activating the parent
membership. It must call the shared included-product sync only after the
parent is active. Manual-approval checkout remains paid/pending until an admin
activates the membership; that admin transition then performs the sync.

At checkout, validate that the selected community plan is active and belongs
to the singleton. Persist its public ID on the parent `learner_membership`.
Existing active memberships retain access to spaces whose matching unlock
has no plan rows or still contains the saved plan if that plan is later
archived; archive affects availability for new checkout, not
already-purchased access.

Admin membership grants must also select a community plan unless the grant is
explicitly `moderate`. Changing a member from `moderate` to `comment` or
`post` is rejected until a plan is assigned. A null community plan on an
ordinary member grants no community-unlocked spaces. Product-unlocked spaces
still follow product memberships.

### Sales-page data

Keep the saved community sales page and its non-deletable **Community**
block (`courselit-community`). The CourseLit page data contains all active
community plans and their structured perks:

```ts
type CommunityPlanPerks = {
  spaces: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    logo: string;
    featuredImage: MediaRef | null;
  }>;
  includedProducts: Array<{
    id: string;
    title: string;
    slug: string;
    kind: "course" | "download";
    communityOnly: boolean;
  }>;
};
```

The Community block on `/join` renders all community plans. Each plan card
shows name, description, formatted price, included spaces, included
products, and its own checkout action. The default plan may be visually
recommended but does not hide the alternatives. Starting checkout sends the
plan ID selected on that card; the community ID remains server-resolved.

### Product page block

Rename `courselit-banner` to **Product** (internal widget name
`courselit-product`). Drop all community resource-type support from this
block. Register it with `registerCourseSalesBlocks()`.

Keep the saved product sales page and its non-deletable Product block.
CourseLit page data for a product includes its active product plans and,
when `includedWithCommunity` is true, the same
structured community-plan perks used on `/join`.

```ts
type ProductSalesOffers = {
  productPlans: Array<StorefrontPlanSummary>;
  community: null | {
    plans: Array<{
      plan: StorefrontPlanSummary;
      perks: CommunityPlanPerks;
    }>;
  };
};
```

The Product block renders:

- **One-off only** (active product plans, flag off): every product plan
  card with product checkout. No community option.
- **Community-only** (flag on, no active product plans): only the community
  membership option — every active community plan card, each starting
  community checkout. No product buy CTA.
- **Both** (flag on and active product plans): both groups on the same
  block. Product plan cards start product checkout. Community plan cards
  start community checkout for that community plan. Labels must make the
  two paths distinct (for example "Buy this course" vs "Included with
  community"). The default product plan may be visually recommended; it
  must not hide the other product plans or the community option.

A learner who already has an active product membership sees continue/access
instead of purchase for the path they already hold. The other path may still
be shown (for example an included member can still buy a one-off plan; a
one-off member need not join the community to keep this product).

Checkout-session creation from a product page accepts either a product plan
ID (resource type product) or a community plan ID (resource type community).
It never requires a client-selected community ID.

**Product picker**

- On **site pages**, the Product admin widget shows a dropdown of the
  school's products. The selected product ID is stored in block settings.
  Public render loads that product's details and offers. An empty selection
  renders an editor placeholder and nothing on the live page.
- On a **product sales page**, hide the dropdown. The product is the page
  resource (`resourceType=product`, `resourceId` of that product). Block
  settings must not override it.
- Curriculum remains a course-only block on product sales pages.

### Community page block

Add a **Community** block in `packages/page-blocks` (internal widget name
`courselit-community`, display name **Community**). Register it with
`registerCourseSalesBlocks()` so it is selectable in the page builder.

- **Allowed on:** site pages (homepage and other school website pages) **and**
  the owned community sales page. `/join` uses this block, not Product /
  `courselit-banner`.
- **Not a product block.** Product sales pages use the Product block (and
  curriculum for courses).
- **Data source:** the singleton community's public details, the same
  payload used today: name, description, featured image, member count, and
  every active community plan with structured perks (spaces and included
  products). Resolve the community from the request host. Do not take a
  community ID from block settings.
- **Injection:** `/join` and site pages that include the block inject that
  community payload into page data so the block does not fetch on its own.
  If the community is disabled, `/join` still returns `404`. On a site page,
  omit plans and checkout; do not 404 the surrounding page. The block
  renders nothing (or a non-interactive empty state in the editor) rather
  than a buy action.
- **UI:** community details plus every active plan as its own card, each
  with formatted price, included spaces, included products, and a join/buy
  action that starts checkout for that exact community plan. Do not submit
  only the default plan. Use page-builder primitives and the active theme.
- **Editor:** the block is available in the block picker on site pages and
  on the community sales page. Settings may cover layout (alignment, media,
  caption) but not which community or which plans to show. There is no
  community dropdown (the school has one community).

Provisioning seeds the community sales page with the Community block (not
`courselit-banner`) and product sales pages with the Product block. Existing
`courselit-banner` instances that targeted a community are replaced by the
Community block. The `courselit-banner` widget name is removed after that
rename.

## Admin application

- The community workspace lives at `/community`, with stable subroutes such as
  `/community/members` and `/community/plans`. Reports are not nested here.
- Spaces are a top-level admin destination at `/spaces`, with
  `/spaces/reports` as the single reports queue for every space (community-
  unlocked and product-only). Admin navigation has Community and Spaces; it
  offers no community collection, selection, creation, or deletion controls.
- The community workspace provides settings, artwork, membership approval,
  community-unlocked space list (read-only, linking to `/spaces`), plans,
  and sales-page editing. The sales-page action opens the canonical
  `/pages/<page_id>/edit` route with `redirectTo`, `resourceType=community`,
  and the singleton public ID. A reports link goes to `/spaces/reports`.
- The product workspace shows the **Included with community** switch. When
  it is on and the product has no active plans, explain that the product is
  community-access only and cannot be bought as a one-off; adding a plan
  makes it purchasable as well. Payment-plan editors do not show the
  switch.
- In the community workspace, show a read-only included-products section with
  product name, status, whether it is community-only, and a link to the
  product. The empty state should direct the administrator to mark a
  product **Included with community**.
- The space editor at `/spaces` exposes:

  - **Description** (text);
  - **Logo** (Lucide icon picker; persist the icon name);
  - **Featured image** (media picker);
  - **Access** (community toggle and product multi-select; each entity has
    an optional plan subset; no plans selected means all members of that
    entity; no entities selected means staff-only);
  - **Follow** (switch: automatically follow this space when a membership
    that unlocks it first becomes active); and
  - **Who can post** (`members` or `admin`).

  Deleting requires a destination space when posts exist.
- Course product workspace: Discussions switch creates or reattaches the
  canonical space. Show a link to that space for access, logo, follow, and
  who can post. Explain that the course viewer shows the panel only when
  the member can access that space.
- Community and product payment-plan create/update do not select spaces.
  Community plan list and `/join` preview show derived space perks from
  community unlocks.
- Surface reconciliation state/failure if the job is asynchronous, without
  reporting completion before all active memberships have converged.

## Learner and public applications

- The public `/communities` route does not exist and is not redirected to
  another collection page.
- `/join` is the canonical public community sales route. It resolves the
  singleton from the request host, loads the community's saved sales page
  (Community block, not Product), injects the public community-plan/perks
  data, and returns `404` when the community is disabled.
- Site pages may include the **Community** page block and the **Product**
  page block. Community data is the singleton. Product data is the product
  chosen in the block dropdown. A disabled community does not 404 the site
  page; the Community block simply has no checkout.
- The aggregate authenticated learner feed lives at `/dashboard`. A
  space-filtered feed uses `/dashboard/s/<spaceId>`, and post details use
  `/dashboard/s/<spaceId>/<postId>`. The learner dashboard has no community
  detail or join route; community acquisition and checkout use `/join`.
- The learner sidebar, feed links, notifications, checkout return URLs, login
  continuations, and page-renderer system route use `/join`, the feed, or
  the course viewer as appropriate.
- `/join` selects the saved community page by the resolved singleton resource,
  not by a caller-controlled community ID or arbitrary slug.
- The Community block on `/join` and on site pages renders every active plan
  as a separate pricing card. Each card lists the spaces that community
  plan includes (community unlocks with no plan rows, plus community
  unlocks whose selected plans contain the plan), each with name,
  description, and logo, plus all currently included products, and starts
  checkout for that exact plan. It must not silently submit only the
  default plan.
- The learner dashboard obtains product access from active
  `learner_memberships`; no component should infer access from the product
  flag. Product checkout and buy CTAs render only when the product has an
  active payment plan. When the product is also included with community,
  the Product block additionally renders the community membership option.
- The learner feed navigation and composer receive only accessible spaces,
  each with name, description, logo, featured image, `whoCanPost`, and
  whether the caller currently follows it. That set is the union of
  community-unlocked and product-unlocked spaces. The composer is offered
  only for spaces the caller can post in. The feed's `All` view unions those
  spaces, and direct requests for a locked space or one of its posts render
  not found. Each accessible space exposes follow and unfollow. Followed
  spaces deliver new-post notifications; unfollowing stops them. The course
  viewer discussion panel uses the same follow control and the same
  notifications.
- The course viewer shows a discussion panel when the product has a
  canonical space the member can access. Posting there uses the space post
  APIs. Those posts appear in the learner feed. There is no per-lesson
  discussion thread.
- All modified learner-facing controls, cards, labels, badges, media, and
  typography must be composed from `@frontlit/page-builder` primitives. If an
  exact primitive is missing, add one centralized theme-aware wrapper rather
  than local hard-coded styles.
- Public and authenticated community views fetch the singleton without a
  `communityId` input. Feed and course-viewer discussion use space IDs
  rather than category strings or lesson discussion targets.

## Analytics and reporting requirements

CourseLit records enough information to measure the community funnel and
explain entitlement decisions without treating derived access as product
revenue.

### Funnel events

Record school-scoped events for:

- `/join` viewed;
- community plan selected;
- checkout started, completed, failed, cancelled, refunded, or disputed;
- community membership requested, activated, rejected, paused, expired, or
  left;
- included product membership activated or revoked;
- space viewed, followed, or unfollowed;
- space notification delivered or suppressed by preference; and
- post created, comment created, and reaction created.

Events include the community public ID, product public ID when applicable,
community or product plan public ID when applicable, space public ID when
applicable, and whether the membership is direct or derived. Event metadata
must not contain payment secrets, raw provider payloads, joining-reason
text, post bodies, or other unnecessary personal content.

### Reporting semantics

- Community member counts include active community memberships only.
- Plan conversion is attributed to the community plan selected on `/join`.
- Included product memberships may count toward learner/customer and product
  participation metrics, but never product sales or product revenue.
- A learner with both direct and derived access counts once in unique learner
  metrics.
- Space engagement includes activity only from actors authorized for that
  space at the time of the event.
- Operational reporting distinguishes reconciliation pending, succeeded,
  retried, and permanently failed states.

### Product metrics

Monitor:

- `/join` view-to-plan-selection and plan-selection-to-activation conversion;
- active community members by plan;
- active learners by space;
- included-product activation and revocation counts;
- checkout and manual-approval completion rates;
- denied cross-space access attempts; and
- reconciliation backlog, retry rate, and terminal failure rate.

Initial releases establish baselines rather than inventing numeric targets.
Targets may be set after real usage data is available.

## Non-functional requirements

### Security and tenant isolation

- Resolve school context from a verified host or authenticated selection.
- Include `school_id` in every community, space, plan, membership, content,
  commerce, and reconciliation query.
- Never authorize access from a client-supplied school, community, plan, or
  space ID alone.
- Return `404` for inaccessible learner content so locked-space existence is
  not disclosed.
- Verify payment webhook signatures and preserve idempotency before changing
  membership or included-product state.
- Keep learner commerce isolated from CourseLit platform billing and use only
  the school's configured provider credentials.

### Reliability and consistency

- School/community/owner/space provisioning is atomic.
- Plan updates are atomic. Space create/update and that space's unlock and
  unlock-plan assignment changes are atomic.
- Checkout retries, webhook retries, and bundle reconciliation retries are
  idempotent.
- Derived access converges after transient job failures without duplicating
  memberships, notifications, lifecycle hooks, invoices, or payments.
- Financial history and archived-plan rows on space unlocks remain readable
  for audit and entitlement explanation.

### Performance

- Feed authorization is applied in the database before pagination and counts.
- Space, membership, space-unlock, space-follower, and parent-membership
  queries use indexed tenant-scoped paths.
- Reconciliation processes memberships in bounded pages and never holds an
  unbounded transaction open.
- `/join` obtains community, active plans, spaces, and included products in a
  bounded query set that does not grow linearly with the number of plans.
- Sales blocks do not trigger one client request per plan or perk.

### Accessibility and theming

- Plan cards, space selectors, checkout actions, dialogs, and feed filters are
  keyboard accessible and expose meaningful labels and focus states.
- Pricing and perk relationships are understandable without color alone.
- Screen readers announce the recommended plan, price, billing cadence,
  included products, included spaces, loading state, and checkout errors.
- Responsive layouts preserve complete plan and perk information without
  horizontal clipping.
- Learner-facing UI uses page-builder primitives and honors typography,
  spacing, color, borders, radii, and shadows from the active school theme.
  Space logos are Lucide icons that inherit the active theme's foreground
  color rather than a hard-coded fill.

## Documentation requirements

- Replace category terminology and product-discussion terminology with space
  terminology throughout product and API documentation.
- Document how administrators create spaces, set description, logo, featured
  image, community and product unlocks, follow, and who can post, turn on
  course discussions, mark a product **Included with community**,
  preview `/join`, and enable the community.
- Document that an unlock with no selected plans means all members of that
  entity, that no unlocks means staff-only, and that community plan perks
  are derived from community unlocks rather than selected on the plan.
- Document auto-follow when a membership first becomes active, that members
  can follow or unfollow accessible spaces afterwards, and that followers
  receive new-post notifications until they unfollow.
- Document that course discussion is a space in the learner feed, not a
  per-lesson thread.
- Document learner outcomes for free, paid, manual-approval, expired,
  refunded, and disputed memberships.
- Document the Community page block: add it on a site page or edit it on
  `/join`, what data it shows, and that it always uses the school's
  community.
- Document the Product block: pick a product on site pages; on a product
  sales page the product is assumed.
- Capture updated screenshots of community settings, the space editor
  (description, logo, featured image, unlocks, follow, who can post), the
  product Discussions switch, the product **Included with community**
  switch, `/join` (Community block), a dual-path Product block, the Product
  block's site-page product dropdown, the Community site-page block, the
  course-viewer discussion panel, and the authenticated feed when the UI is
  stable.
- Explain that deleting a space requires moving its posts and that archiving a
  plan does not erase access already held by active members on that plan
  while the matching unlock still includes it.

## Data import and initialization requirements

The application schema is initialized from the V1 baseline. School imports
must satisfy the singleton and entitlement invariants even when an input
dataset contains multiple communities:

- Group imported communities by school and create one CourseLit community.
- When a school has several imported communities, use the oldest enabled
  record, falling back to the oldest record, for display and admission
  settings.
- Convert every distinct imported category label into a school-level space,
  namespace colliding slugs deterministically, and map posts, comments,
  reactions, reports, and media references to the correct target space.
  Imported spaces start with empty description, logo `MessagesSquare`, no
  featured image, a community unlock with no plan rows, `whoCanPost =
  members`, and `follow = true` only for `General`.
- Collapse a person's imported community memberships into one
  `learner_membership`. Preserve the strongest active access level, then
  pending, then inactive status, and retain input identifiers in migration
  links for idempotency.
- Keep plans associated with the selected community active. Preserve plans
  associated with other imported communities as archived records so
  historical checkout and payment references remain resolvable without
  violating active-plan uniqueness.
- Do not create `space_unlock_plans` rows for imported category spaces.
  Category-era imports have no plan restriction, so each imported space is
  unlocked by the community for all members.
- Do not import per-lesson `product_discussion_*` threads into spaces. If a
  course had discussions enabled, create or reattach a canonical product
  space with all-members product unlock and do not copy historical lesson
  comments.
- Union included-product references found in imported plan data. For each
  such product, set `includedWithCommunity` on the product. Keep any
  imported product plans as one-off offers. An included product with no
  product payment plan is community-only, not an import error.
- Link imported included-product memberships to the consolidated parent
  community membership, retain `isIncludedInPlan = true`, and reconcile their
  final status against the community bundle after import.

The import report includes input community counts, collapsed memberships,
archived extra plans, created spaces, flagged product plans, and unresolved
products. Import retries are tenant-safe and idempotent.

## Delivery sequence

1. **Schema and contract:** rewrite the baseline, add the singleton, school-
   level spaces (description, logo, featured image, follow, who-can-post,
   unlocks, unlock plans), space followers,
   `products.included_with_community`, `products.discussion_space_id`;
   remove `community_memberships` and
   `product_discussion_*`; update the shared API contract/types.
2. **Provisioning and membership domain:** create the community during school
   provisioning and convert community authorization/member management to
   `learner_memberships`.
3. **Spaces:** replace category strings and product-discussion threads with
   school-level spaces, add unlocks and plan subsets, auto-follow on
   activation, `whoCanPost` enforcement, access-aware feed/content queries,
   and the course-viewer panel.
4. **Bundle engine:** add product-level `includedWithCommunity` validation,
   idempotent child-membership sync, bounded reconciliation, lifecycle
   hooks, and revocation behavior.
5. **Commerce:** remove plan-level product arrays, persist the selected
   community plan, and update checkout, approval, webhook, subscription,
   refund, and leave flows.
6. **Admin UI:** replace the community collection workspace with the singleton
   workspace; add top-level Spaces (description, logo, featured image,
   unlocks, follow, who can post); add the course Discussions switch and
   the product **Included with community** switch; show bundle status.
7. **Learner/public UI:** remove `/communities`, add the `/join` saved sales
   page using the Community block, add the selectable Community and Product
   site-page blocks, rename `courselit-banner` to Product (product-only,
   dropdown on site pages, hidden on product sales pages), show both
   one-off and community options on dual-path Product blocks, make
   `/dashboard` the aggregate spaces-based feed, add `/dashboard/s/<spaceId>`
   for filtered space feeds, and mount the course-viewer
   discussion panel on the product's space using page-builder primitives.
8. **Imports and documentation:** update import pipelines, product
   documentation, and screenshots once the UI is stable.
9. **Cleanup:** remove plural routes, category code, `product_discussion_*`
   APIs and UI, dead catalog components, obsolete DTOs, duplicate membership
   code, and stale tests.

Each phase should keep API and contract changes in the same commit so the
admin and learner clients cannot compile against a half-migrated shape.

## Test plan

### Database and provisioning

- Creating a school creates exactly one disabled community, one `General`
  space with a community unlock, and one active owner `moderate` learner
  membership in the same transaction.
- Concurrent repair/provision attempts cannot create a second community.
- A second direct insert for the same school fails the unique constraint.
- Disabling a community preserves posts, members, plans, sales-page data, and
  financial history.
- Disabling hides `/join` and blocks new checkout without interrupting access
  for an already-active member or changing derived product memberships.

### Spaces and unlocks

- School provisioning creates exactly one `General` space with logo
  `MessagesSquare`, a community unlock with no plan rows, `follow = true`,
  and `whoCanPost = members`.
- Space create/update accepts description, Lucide logo name, featured image,
  `unlocks`, `follow`, and `whoCanPost`, and atomically persists unlock and
  unlock-plan rows. `PUT /v1/spaces/order` rewrites positions. `DELETE`
  requires `destinationSpaceId` when posts exist and rejects deleting the
  last space.
- `PUT /v1/learner/spaces/:spaceId/follow` is idempotent `200 { followed:
  true }` when already following. `DELETE` is idempotent `200 { followed:
  false }` when not following. Inaccessible spaces return `404` for both.
- A community `post` member can create posts only in accessible spaces where
  `whoCanPost = members`. In `whoCanPost = admin` spaces they receive `403`
  on create while still being able to read, comment, and react. Product
  members may post in product-unlocked `whoCanPost = members` spaces.
  Authorized staff can create posts in every space; community moderators
  can create posts in community-unlocked `admin` spaces.
- A community unlock with no plan rows is visible to every active community
  member; selected plans restrict it. A product unlock behaves the same for
  product members. No unlocks means staff-only.
- Cross-school entities, mismatched plan entity types, and unknown IDs are
  rejected. Community and product plan create/update reject `spaceIds`.
- A space may be unlocked by the community and several products at once.
  Access is the union.
- Switching plans changes accessible spaces immediately and drops follower
  rows for spaces the member can no longer access through any membership.
- Activating a community or product membership auto-follows spaces that
  membership unlocks when `follow = true`. Toggling follow later does not
  retroactively follow existing members.
- Members can follow and unfollow accessible spaces; inaccessible spaces
  return `404`. A new post notifies current followers except the author.
  Unfollowing stops further space-level notifications. Muting
  `space_post_created` suppresses delivery without unfollowing.
- Free joins and ordinary admin grants persist a selected plan; a planless
  ordinary community membership is rejected.
- Archived plans remain resolvable for existing active memberships but are
  absent from `/join` and unavailable for new checkout.
- Ordinary members cannot access locked feeds, post details, comments,
  reactions, reports, follows, counts, or notifications.
- Space deletion migrates posts and removes unlocks, follower rows, and
  featured-image references atomically; `discussion_space_id` on products is
  cleared.

### Product discussion spaces

- Enabling discussions on a course creates a canonical space with a product
  unlock defaulting to all product members. Disabling hides the course-viewer
  panel and keeps the space.
- Restricting that unlock to a subset of that product's payment plans hides
  the panel from members whose recorded product plan is not in the set.
  Clearing the subset restores all-members access.
- Included-with-community members get the space when it is all-members.
  They do not get a plan-restricted product space even if their stored
  community `payment_plan_id` happens to equal a product plan ID.
  Community-only products have no plan subset to choose.
- A post created in the course-viewer panel appears in the learner feed.
- Per-lesson discussion routes are absent.

### Product acquisition

- Product create/update accepts `includedWithCommunity`; plan endpoints
  reject it.
- Publishing succeeds with `includedWithCommunity` and no active plans
  (community-only). Publishing with the flag off and no active plans fails.
- Clearing the last acquisition path on a published product is rejected.
- Community-only products have no product checkout. Adding an active plan
  makes one-off purchase available without removing the community grant.
  The Product block then shows both option groups.
- Archiving every product plan while the flag stays on leaves the product
  community-only.
- Draft products are not granted. Publishing, unpublishing, toggling the
  flag, and deleting the product all enqueue and complete the expected
  reconciliation.

### Membership and commerce

- Active free and successfully paid community memberships receive one child
  membership for every eligible product.
- Pending manual-approval memberships receive no children; approval grants
  them once.
- Planless moderator/staff memberships receive no included-product children.
- Webhook retries and reconciliation retries do not create duplicate rows or
  duplicate lifecycle events.
- Leave, expiry, payment failure, refund, dispute, and rejection expire only
  children of the affected parent.
- Direct access remains active when derived access expires.
- Removing one product from the bundle expires that child for every active
  member without changing the parent or other children.
- Adding a product back reactivates/upserts the same logical child access.
- Product sales/revenue excludes community-derived access; learner/customer
  metrics and intended post-membership hooks include it.
- School A can never grant School B's product, plan, membership, or community.

### API and UI

- Singular admin, learner, and public endpoints resolve the community from
  the verified school context.
- Plural create/list/delete routes are absent.
- Disabled communities return `404` publicly and reject new checkout;
  authenticated active members retain their community navigation and access.
- Admin permissions reuse `communities:read` / `communities:write` /
  `communities:moderate` and `products:write`. There are no `spaces:*` keys.
  `communities:moderate` covers product-only spaces.
- Admin navigation has Community and Spaces destinations, reports under
  `/spaces/reports`, and no community create/list/delete controls.
- Product forms persist **Included with community**. Plan forms do not.
- Community-only products publish without a plan and expose no one-off
  checkout. Products with plans still require an active plan to publish
  unless the community flag is on.
- The space editor persists description, Lucide logo, featured image,
  unlocks (community and/or products, optional plan subsets), follow, and
  who can post, and does not write those fields from plan editors.
- Enabling discussions on a course persists `discussionSpaceId` and a
  product unlock defaulting to all members. Restricting it accepts only that
  product's payment plan IDs.
- `/communities` is absent and `/join` renders the singleton's saved sales
  page or `404` when disabled.
- `/join` uses the Community block and renders every active community plan,
  formatted pricing, the spaces that community plan includes, all shared
  included products, and a plan-specific checkout action.
- The Community page block is selectable on site pages and on the community
  sales page, reads injected singleton community details, and starts
  checkout for the plan on the card the learner chose. A disabled community
  404s `/join` and leaves other site pages up with no checkout on the block.
- The Product block (`courselit-product`) has no community resource type.
  On site pages the admin widget shows a product dropdown. On a product
  sales page the dropdown is hidden and the product is the page resource.
- A product that is both one-off purchasable and included with community
  renders both option groups on the Product block. Community-only products
  render only community plans. One-off-only products render only product
  plans.
- `/dashboard` and `GET /v1/learner/feed` union posts from every
  accessible space. The course viewer shows the product's space when the
  member can access it.
- Public checkout and learner views render plan perks and remain themeable
  under at least two page-builder themes.
- Notification, feed, post, checkout-return, and sales-page-editor links all
  use canonical singleton or space-scoped routes. No learner link uses a
  community ID as the page context.

### Release validation

- API, shared-contract, admin, learner, and workspace lint/type checks pass.
- The complete API test suite passes.
- The baseline applies cleanly to a disposable database.
- School, payment-plan, community, learner, and notification imports pass
  idempotency and tenant-isolation tests.
- Free, manual-approval, one-time, installment, and subscription flows are
  verified end to end, including payment webhooks and revocation.
- `/join`, `/dashboard`, `/dashboard/s/<spaceId>`, and the course-viewer discussion panel
  are manually checked on desktop and mobile under at least two materially
  different school themes.
- Accessibility checks cover keyboard navigation, focus order, screen-reader
  plan summaries, form errors, and reduced-motion behavior.

## Acceptance criteria

- Every school has exactly one durable community and no supported operation
  can create a second or delete it independently of the school.
- Admin and public clients use singleton community navigation. Learner clients
  use `/join` for community commerce and space-scoped routes for participation;
  they do not require a community ID in the page URL.
- The public storefront portal has no `/communities` catalog; `/join` is the
  canonical community sales page.
- A product can be marked **Included with community**. That flag lives on
  the product. A published product must have at least one acquisition path:
  an active payment plan and/or the community flag. Community-only products
  have no one-off checkout.
- Every community plan sells access to the same school-level derived product
  bundle. Spaces are school-owned and unlocked by the community and/or
  products; an unlock with no selected plans is open to all members of that
  entity. Community and product plans no longer store product ID arrays or
  space ID arrays.
- Categories and `product_discussion_*` no longer exist in the API or
  database. Posts reference durable school-level spaces. Each space has
  description, Lucide logo, featured image, unlocks, follow, and
  who-can-post settings. Learner access is derived from active community and
  product memberships matched against those unlocks.
- Enabling discussions on a course creates a canonical product space. If the
  product has a space the member can access, the course viewer shows it.
  Posts from that panel appear in the learner feed. Per-lesson discussion
  threads do not exist.
- Membership activation auto-follows spaces whose follow flag is on and that
  membership unlocks. Members can follow or unfollow accessible spaces
  afterwards and receive or stop space-level notifications accordingly.
- `/join` uses the Community block and shows all active plans and, for each
  one, its price, included spaces, shared included products, and checkout
  action.
- Site pages can insert the same Community block.
- `courselit-banner` is the Product block: product-only, product dropdown on
  site pages, no dropdown on the product sales page.
- A product that is both one-off purchasable and included with community
  shows both acquisition options on the Product block.
- Activating community access grants idempotent child product memberships;
  pending access grants none.
- Ending community access or removing a product from the bundle revokes only
  the memberships derived from that parent, preserving direct access.
- `learner_memberships` is the sole source of learner product and community
  access; `community_memberships` no longer exists.
- Learner-facing changes use page-builder primitives and remain fully
  themeable.
- School imports are deterministic, tenant-safe, and idempotent. Included
  products with no payment plan import as community-only.
