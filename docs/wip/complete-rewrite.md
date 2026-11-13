# Complete rewrite: what's left

One ordered list of everything between the rewrite and a product people can
rely on.

## How to use this list

- **Work top to bottom.** Items are ordered by how much they hurt the people
  using CourseLit (creators, their learners, and visitors to their sites):
  1. things that lose data, mishandle money, or don't work;
  2. what visitors and learners see;
  3. a creator's first hour;
  4. security hardening;
  5. features `main` has that the rewrite lacks;
  6. the competitor roadmap;
  7. maintenance.
- **Tick an item when it is merged and deployed.** Don't skip ahead. If an item
  is blocked, write why under it and move to the next one.
- **Items marked "confirm first"** may not be real problems. Check before
  building.
- **Add new findings where they belong** by the same rule, with a source tag.
  Renumbering is fine.
- **Before building anything, check `main`,** which may already have it.

Source tags:
- **QA:** creator and learner walkthrough, 2026-11-03.
- **Parity:** code comparison with `main` v0.74.4, 2026-11-10. The
  item-by-item comparison is in `docs/platform-rewrite-parity-ledger.md`.
- **Audit:** `bun audit`, 2026-11-10.
- **Roadmap:** gaps against Kajabi, Circle, Podia and Teachable. These come from
  general knowledge of those products as of mid-2026, so treat them as
  approximate.

## Where we stand

Close to Podia and Teachable for selling courses and downloads. Well short of
Kajabi's breadth and of Circle on community depth.

What the rewrite already has:

- **Products:** courses and downloads; text, video, audio, PDF, file, embed,
  quiz and SCORM lessons; drip release and drip emails; certificates with
  verification; private previews; lead magnets; per-product analytics.
- **Commerce:** free, one-time, subscription and installment plans; bundles;
  Stripe, LemonSqueezy and Razorpay on the school's own accounts.
- **Community:** spaces, feed, posts, comments, reactions, GIFs, media,
  moderation reports, notifications, paid community plans.
- **Website:** themed page builder, blog, custom domains, code injection.
- **Marketing:** contacts, segments, broadcasts, sequences, templates,
  newsletter signups.
- **Platform:** multiple schools per account, team roles, API keys, REST API
  with an MCP server, Cloudflare Turnstile.

Edges the others don't have: school-owned payment gateways with no platform
cut, full REST and MCP coverage, multiple schools per account, open source.

## 1. Data loss, money and broken features

All eight were deployed to QA on 2026-11-11 (images `rewrite-37d53649`) and
checked there in the browser: on each of Stripe, LemonSqueezy and Razorpay,
saving the keys connected the webhook, a purchase granted access, and a refund
removed it. Stripe also covered the receipt, the sale alert and a learner
cancel.
Found during that pass and fixed, not yet deployed: a learner who bought
again one-time after a refunded subscription saw "Subscription ended" on the
product, and the admin sign-in page showed developer notes.

- [x] **1. Signup forms that save nothing.** The generic "Email signup" and
  "Support form" page blocks say they succeeded but store nothing. _(Parity)_
  - Fixed 2026-11-10, deployed to QA 2026-11-11. Both blocks need FrontLit backends
    (lead capture, support tickets), so they are out of the block picker and
    the API rejects pages that use them. "Newsletter signup" saves the contact
    (checked in the browser).
- [x] **2. Image upload inside page-builder blocks is broken.** _(Parity)_
  - Fixed 2026-11-10, deployed to QA 2026-11-11. The page editor now provides the
    school's media library; upload, publish and the live page were checked in
    the browser.
- [x] **3. The contacts list loads only the first 100 contacts** and filters them
  in the browser. _(Parity)_
  - Fixed 2026-11-10, deployed to QA 2026-11-11. The list pages and filters on the
    server. Also fixed: pages after the first skipped contacts (SendLit's
    `offset` is a page number), filters were dropped silently, and saved
    segments never listed (SendLit returns a bare array).
- [x] **4. Check paid flows against real Stripe, LemonSqueezy and Razorpay test
  accounts:** checkout, receipts, sale alerts, cancellation and refunds. _(QA)_
  - Stripe checked 2026-11-10: one-time and subscription checkout, receipt,
    sale alert, refund, learner cancel and creator remove-access all work.
    Saving a provider's keys now registers the payment webhook on the
    school's account (checked against all three with real events).
  - LemonSqueezy checked 2026-11-10: one-time and monthly checkout, receipt,
    sale alert, refund (access removed), learner cancel (access kept until the
    period ends) and refund of the first subscription charge (access removed),
    all through real webhooks.
  - LemonSqueezy's checkout shows our price as the headline, then its own
    line "<variant price> billed every month" under it, taken from the
    variant's list price. The charge and renewals use our price. Nothing in
    the checkout API changes that line (`subscription_preview` and hiding the
    description don't), and variants can't be edited through the API.
    Creators are told on the settings page to price the variants to match
    their usual plan.
  - Razorpay checked 2026-11-11 with the school in INR (the QA account has
    international cards off): one-time and monthly checkout, learner cancel
    (kept until the period ends), and refund of the subscription's first
    charge (access removed, subscription cancelled), all through real
    webhooks. Before this, every Razorpay API call failed authentication, so
    its checkout never opened.
- [x] **5. Refunds of a first subscription charge on Stripe's March 2025 API or
  later.** _(QA)_
  - Fixed 2026-11-10, deployed to QA 2026-11-11. Confirmed against Stripe on
    `2025-03-31.basil`: the refund named only the payment intent and was
    dropped. Invoice payments are now recorded under their payment intent.
- [x] **6. Webhooks that can't be tied to a school return an error.** _(QA)_
  - Fixed 2026-11-10, deployed to QA 2026-11-11. They are acknowledged and ignored.
    Also fixed: after switching provider, the old provider's renewals, refunds
    and cancellations were rejected.
- [x] **7. A file download end to end.** _(QA)_
  - Checked 2026-11-10. Fixed on the way, deployed to QA 2026-11-11: the zip was named
    after its token, because the proxies dropped `Content-Disposition`.
- [x] **8. Wrong gateway keys fail silently.** _(QA 2026-11-10)_
  - Fixed 2026-11-11, deployed to QA 2026-11-11. Saving keys the provider rejects shows
    why on the settings page. When the provider refuses to start a checkout,
    the learner is told the school can't take payments right now, the owner
    and payment managers get a "refused a checkout" alert (at most one an
    hour), the reason is logged, and the learner no longer shows up as
    "Payment Failed" on the Customers list.

## 2. What visitors and learners see

- [x] **9. Placeholder content goes live.** The default homepage ships the
  CourseLit promo video, "Ask user to take action", a "default page created for
  you" notice and generic feature-grid copy. Terms and Privacy are published but
  empty, and checkout links to the Terms. _(QA)_
  - Fixed 2026-11-03 (64265100), checked on QA 2026-11-11. A new school's
    homepage is built only from blocks that fill themselves from the school
    (hero, published offers, newsletter signup), with no copy baked in. Terms
    and Privacy start as unpublished drafts, and the site and checkout don't
    link to them until they're published. What's left is item 19a.
- [x] **10. Two learner-facing places still say CourseLit instead of the school.**
  - The learner sign-in code email is titled "Your CourseLit Sign-in Code" and
    headed "CourseLit Security Code" (`apps/api/src/auth/options.ts`). Fine for
    the admin; a learner should see the school's name.
  - The certificate verification page header says "CourseLit".

  The site itself is branded with the school (checked on QA 2026-11-11): the
  header, footer, product placeholders and learner sidebar use its name, logo
  and tagline. _(QA)_
  - Fixed 2026-11-11. Learner codes now go out like the school's
    other email, through its mailing team when it has one: "Sign in to
    <school>", in the school's name, and with the real 10-minute expiry.
    The email used to say 5 minutes. Certificate verification returns
    `schoolName`, and the page header shows it.
    Each school's SendLit team is now created with the school's name as its
    sender name, which replaces "CourseLit Shared". Checked on the local stack
    2026-11-11. On the next QA deploy, QA's existing teams still need their sender name set once,
    because CourseLit's SendLit key can't update teams (`teams:manage`).
- [x] **11. The public header shows "Join" when the learner is already signed
  in.** _(QA)_
  - Fixed 2026-11-12, checked locally. Public pages are cached, so the server
    renders the signed-out header and the browser swaps "Log in" and "Join" for
    a single "Dashboard" once the learner's session is confirmed.
- [x] **12. Free courses show "$0.00"** in the catalogue instead of "Free".
  Checkout for a free product also shows "$0.00" and "Complete Purchase".
  _(QA)_
  - Fixed 2026-11-12, checked locally. The storefront formats every price
    through one helper (`apps/storefront/lib/price.ts`) that shows "Free" for a
    zero price: the catalogue card, product and community plans, the course
    page and checkout. Checkout's button reads "Get for free" for free plans,
    as on `main`.
- [x] **13. Signed-out checkout is misleading.** It says "This community is not
  available for checkout yet" until the learner signs in. _(QA)_
  - Fixed 2026-11-12, checked locally. Checkout showed that message while its
    plans were still loading. It now says "Loading plans…" until they arrive,
    signed in or not.
- [x] **14. A pending join request isn't acknowledged.** After asking to join,
  the learner lands on the feed with the members' welcome banner and "You do not
  have access to any spaces yet". Nothing says the request is pending. _(QA)_
  - Fixed 2026-11-12, checked locally. The feed now says "Your request to join
    <community> is waiting for approval. We'll let you know." `/join` already
    said so.
- [x] **15. The learner sidebar is stale after joining** until a reload. _(QA)_
  - Fixed 2026-11-12, checked locally. Joining through `/join` and checkout ends
    in a full page load, so the sidebar is fresh. Joining from inside the
    dashboard now tells the sidebar to reload its spaces, as leaving already did.
- [x] **16. The course page doesn't say it is included with the community
  plan.** _(QA)_
  - Fixed 2026-11-12, checked locally. A course counts as included when a
    community plan lists it, not only when it is marked "included with the
    community". Its sales page now offers those plans, and the course page says
    "Also included in <community> with the <plan> plan" with a link to join.
- [x] **17. A learner can't find where to cancel a subscription.** Purchases
  lists it with no action; cancelling is only on My products.
  _(QA 2026-11-10)_
  - Fixed 2026-11-12, checked locally. Subscriptions on Purchases have "Manage
    subscription", which goes to the product's card on My products with its
    Cancel button. Community subscriptions get "Manage membership", which goes to
    the feed, where leaving cancels billing.
- [x] **18. The learner's name is the email prefix.** No name is collected at
  sign-up. _(QA)_
  - Fixed 2026-11-12, checked locally. While a learner's name is still the one
    made from their email, signing in with a code asks "What should we call
    you?" (on the login page and at checkout). It can be skipped; the name can
    also be changed on the profile.

## 3. A creator's first hour

- [x] **19. No onboarding.** A new account lands on an empty stats board with no
  getting-started checklist. Creating a school doesn't open it. The creator's
  name defaults to the email prefix. See `docs/wip/admin-onboarding-journey.md`.
  _(QA)_
  - Fixed 2026-11-03 (64265100), checked on QA 2026-11-11. A new account opens
    the setup wizard, which asks for the creator's name first, then the
    school, first offer, site, email and plan, and the dashboard shows an
    onboarding checklist.
  - Also fixed 2026-11-11 (5fce57d4, Platform 0.9.0), checked on QA: the plan
    step failed with "Authentication is required" for anyone who had been
    signed in for more than 15 minutes, which is most people finishing the
    wizard. Billing actions no longer ask for a recent sign-in; the
    single-use grant already stops replay and CSRF.
- [x] **19a. Terms and Privacy start empty.** Onboarding asks the creator to
  fill them in, but the drafts are blank. Start them with short editable
  text. _(QA 2026-11-11)_
  - Fixed 2026-11-12, checked locally. A new school's Terms and Privacy drafts
    start with a short rich-text block that names the school (account,
    purchases, refunds, conduct; what's collected, how it's used, payments,
    sharing). They stay unpublished until the creator reviews and publishes
    them, and the checklist item now reads "Review and publish".
- [x] **20. Email can go out unedited.** New emails default to "Start writing
  here" with no guard. The mailing address is required, but nothing prompts for
  it during setup. _(QA)_
  - Fixed 2026-11-12, checked locally. The API refuses to start a broadcast or
    sequence, or publish into a running sequence, while an email has no
    subject, no content or the "Start writing here" placeholder. Send, Schedule
    and Activate are disabled with the reason. A banner asks for the mailing
    address up front, and the "Add your mailing address" dialog now opens (it
    matched the wrong wording).
- [ ] **21. The first navigation in the admin is slow.** Some pages took 20 to 30
  seconds. _(QA)_
- [x] **22. Publishing a lesson takes three steps:** open it, switch Publish on,
  then Update. Lessons default to Draft, and the list has no quick publish.
  _(QA)_
  - Fixed by the product redesign: each lesson on the Content tab has a quick
    Live/Draft switch, "Make all drafts live" publishes every draft at once,
    and each product sets whether new lessons start live or as drafts.
- [ ] **23. Community details need an explicit Save** at the bottom of the page.
  Navigating away loses edits with no warning. _(QA)_
- [x] **24. The contact filters in the UI cover only email, tag, subscription and
  signed up.**
  - Product, community, last active and permission are missing, though
    `apps/api/src/contact-filters.ts` supports most of them.
  - This also limits broadcast and sequence audiences.

  _(Parity)_
  - Fixed 2026-11-12, checked locally. The builder offers product, community,
    last active and permission in contacts, segments, and broadcast and
    sequence audiences. Permission is new in the API and synced to contacts on
    team changes. Also fixed: the broadcast recipient count was empty for any
    filter. Still open: product access and community membership changes don't
    re-sync the contact, so those filters go stale until the learner signs in.
- [x] **25. The product Visibility switch's helper text** stays "Only accessible
  via direct link" whichever way it is set. _(QA)_
  - Fixed by the product redesign: Visibility is now a choice between "Anyone"
    and "Only people with the link", each with its own description.
- [ ] **26. There is no testimonials or social-proof block** in the page
  builder. _(QA)_

## 4. Security hardening

- [ ] **27. Move to zod 4.** Zod 3 has no fix for GHSA-mrhx-c7xc-m3w5 (high):
  validating an oversized constrained collection can exhaust memory.
  - The API, storefront and `api-contract` pin zod 3.25.76.
  - So do ts-rest, the patched `@anatine/zod-openapi` and our `@codelitdev/*`
    packages, and they all need zod 3.
  - This is a migration, not a version bump.

  _(Audit)_

## 5. Missing compared with `main`

- [ ] **28. Confirm the two changes made on purpose.**
  - One community per school instead of many, with no public `/communities`
    list (`apps/api/docs/one-community-per-school.md`).
  - Course discussions are one community space per course, not one per lesson.

  _(Parity)_
- [ ] **29. Pinning community posts.** The API supports it and the feed shows a
  "Pinned" badge, but no screen sets it. _(Parity)_
- [ ] **30. Unpublishing a blog post.** There is no endpoint or button.
  _(Parity)_
- [ ] **31. A tag management page:** counts, delete a tag, untag everyone.
  _(Parity)_
- [ ] **32. Reply by email** to discussions and community posts. See
  `docs/wip/community-replies-from-email.md`. _(Parity)_
- [ ] **33. Per-school Google login** with the school's own client ID and secret,
  and per-school toggles for login methods. Google login is now platform-wide,
  set by env vars. _(Parity)_
- [ ] **34. SAML SSO login.** _(Parity)_
- [ ] **35. Editing a comment.** It exists in the API only. _(Parity)_
- [ ] **36. A share button on community posts.** _(Parity)_
- [ ] **37. A "Downloaded" column for download products.** _(Parity)_
- [x] **38. The list of contacts in a sequence.** Only the count is shown.
  _(Parity)_
  - Fixed 2026-11-12, checked locally. A sent broadcast or active sequence lists
    its subscribers a page at a time (name, email, subscribed).
- [ ] **39. A "From" name for each sequence.** _(Parity)_
  - Blocked on SendLit: its sequences have no sender field, so every send uses
    the team's From name. SendLit needs a nullable `from_name` on sequences,
    used when sending, before CourseLit can offer it.
- [ ] **40. Subscription ID and payment method in the community member list.**
  _(Parity)_
- [ ] **41. Unsplash in page-builder blocks.** Today it is in the community image
  and rich text only. _(Parity)_
- [ ] **42. A version or about page.** _(Parity)_

## 6. Roadmap against competitors

- [ ] **43. Discount codes.** Every competitor has them. Issue #839.
- [ ] **44. Outbound webhooks and Zapier.** Without them creators can't connect
  CourseLit to their other tools. Issue #843 (relates to #645 and #636).
- [ ] **45. Getting members into the community.** Admins can already invite a
  person by email onto a plan (the Invite button on Members). Still missing:
  - a shareable invite link;
  - CSV import;
  - member search on the Members tab.
- [ ] **46. Community moderation tools:**
  - bulk approve and reject;
  - mute or ban a member;
  - content rules and keyword filters;
  - moderator permissions for each space.
- [ ] **47. Trials and coupons on community plans.** Standard in Kajabi and
  Circle.
- [ ] **48. Order bumps and upsells at checkout.** Bundles already exist, so this
  is a short step. Issue #841 (relates to #426).
- [ ] **49. Onboarding new community members.** Today there is a welcome banner.
  Still missing:
  - a welcome post or onboarding checklist;
  - profile prompts;
  - automated welcome messages.
- [ ] **50. Affiliate program.** A growth lever on Kajabi, Teachable and Podia.
  Issue #840.
- [ ] **51. Importers from Teachable, Kajabi and Thinkific.** Switching cost is
  the main thing stopping creators from moving.
- [ ] **52. Tax handling.** LemonSqueezy is the merchant of record, so it covers
  this. Stripe and Razorpay schools are on their own.
- [ ] **53. Live sessions:**
  - events and a calendar, including a calendar space in the community;
  - coaching bookings;
  - webinars through Zoom or a link.

  This is Circle's and Kajabi's moat, and cohort courses depend on it. Issue
  #842 (relates to #390).
- [ ] **54. Community analytics:** active members, posts per week, pending
  requests over time, churn.
- [ ] **55. Engagement tools:**
  - chat or DMs;
  - challenges;
  - gamification (points, levels, leaderboards);
  - polls;
  - digests.
- [ ] **56. Multiple communities per school, and groups of spaces with access
  set for each space.** Only if item 28 reverses the decision to have one
  community per school.
- [ ] **57. A member directory.**
- [ ] **58. A native mobile app, or at least a PWA.**
- [ ] **59. Funnels, and the automation layer** that joins email, access, coupons
  and affiliates.
- [ ] **60. AI drafting of courses and copy.**
- [ ] **61. Podcasts.**

## 7. Maintenance

- [ ] **62. minimatch (moderate) and deepmerge (low).** Both come in only through
  the `shadcn` CLI, a dev tool. They clear when shadcn updates its dependencies.
  _(Audit)_
- [ ] **63. Correct the parity ledger.**
  `docs/platform-rewrite-parity-ledger.md` (COM-002) says the admin has pin and
  unpin controls. It doesn't; see item 29.

## Done

- **Core product and community loop** (commit 9dc5a1d8). Covered by regression
  tests in `commerce-webhooks.test.ts`, `commerce-receipts.test.ts` and
  `community-billing.test.ts`.
  - The first subscription charge is counted once.
  - Renewals reach their checkout.
  - Refunds, partial refunds, cancellation and expiry are handled on all three
    gateways.
  - Learners can cancel a product subscription.
  - Creators can cancel a learner's subscription or remove their access.
  - Removing a paying community member cancels their billing first.
  - Learners can leave a community.
  - A learner who already has access can't buy the same product again.
  - Download buyers see the download button wherever the product opens.
  - One receipt per payment, a learner Purchases page, a new-sale
    notification, and platform mail as a fallback when a school has no mail
    setup.
- **QA walkthrough fixes:**
  - Approving a join request now grants the plan's included courses.
  - `/join` serves the community sales page with its edits.
  - Approval-only communities say "Request to join" on both the sales page and
    checkout.
  - Activating a sequence without a mailing address now says to add it in
    Mails → Settings.
- **Turnstile** challenge verified end to end in a normal browser.
- **Dependency audit** (f142df23). Fixed both criticals and all but one high.
