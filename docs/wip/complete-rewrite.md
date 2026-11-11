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

- [ ] **1. Signup forms that save nothing.** The generic "Email signup" and
  "Support form" page blocks say they succeeded but store nothing. _(Parity)_
  - Fixed 2026-11-10, awaiting deploy. Both blocks need FrontLit backends
    (lead capture, support tickets), so they are out of the block picker and
    the API rejects pages that use them. "Newsletter signup" saves the contact
    (checked in the browser).
- [ ] **2. Image upload inside page-builder blocks is broken.** _(Parity)_
  - Fixed 2026-11-10, awaiting deploy. The page editor now provides the
    school's media library; upload, publish and the live page were checked in
    the browser.
- [ ] **3. The contacts list loads only the first 100 contacts** and filters them
  in the browser. _(Parity)_
  - Fixed 2026-11-10, awaiting deploy. The list pages and filters on the
    server. Also fixed: pages after the first skipped contacts (SendLit's
    `offset` is a page number), filters were dropped silently, and saved
    segments never listed (SendLit returns a bare array).
- [ ] **4. Check paid flows against real Stripe, LemonSqueezy and Razorpay test
  accounts:** checkout, receipts, sale alerts, cancellation and refunds. _(QA)_
  - Stripe checked 2026-11-10: one-time and subscription checkout, receipt,
    sale alert, refund, learner cancel and creator remove-access all work.
    Saving a provider's keys now registers the payment webhook on the
    school's account (checked against all three with real events).
  - LemonSqueezy checked 2026-11-10: one-time and monthly checkout, receipt,
    sale alert, refund (access removed), learner cancel (access kept until the
    period ends) and refund of the first subscription charge (access removed),
    all through real webhooks. Its checkout page shows the variant's own price
    ("$10.00 billed every month") under our $5.00 price; the subscription
    really renews at $5.00, but the learner sees a wrong amount.
  - Razorpay checked 2026-11-11: one-time checkout in USD with an Indian test
    card works and access is granted by the webhook. Before this, every
    Razorpay API call failed authentication, so its checkout never opened.
    Still to check: subscriptions, learner cancel, and refunds (the QA
    account's refund API rejects the USD test payment, and international
    cards are off on that account).
- [ ] **5. Refunds of a first subscription charge on Stripe's March 2025 API or
  later.** _(QA)_
  - Fixed 2026-11-10, awaiting deploy. Confirmed against Stripe on
    `2025-03-31.basil`: the refund named only the payment intent and was
    dropped. Invoice payments are now recorded under their payment intent.
- [ ] **6. Webhooks that can't be tied to a school return an error.** _(QA)_
  - Fixed 2026-11-10, awaiting deploy. They are acknowledged and ignored.
    Also fixed: after switching provider, the old provider's renewals, refunds
    and cancellations were rejected.
- [ ] **7. A file download end to end.** _(QA)_
  - Checked 2026-11-10. Fixed on the way, awaiting deploy: the zip was named
    after its token, because the proxies dropped `Content-Disposition`.
- [ ] **8. Wrong gateway keys fail silently.** With an invalid Stripe secret
  the learner sees "Unable to start checkout" and the creator is told nothing;
  the provider's error is swallowed. Each failed attempt also leaves the
  learner on the product's Customers list as "Payment Failed", though they
  never paid. _(QA 2026-11-10)_

## 2. What visitors and learners see

- [ ] **9. Placeholder content goes live.** The default homepage ships the
  CourseLit promo video, "Ask user to take action", a "default page created for
  you" notice and generic feature-grid copy. Terms and Privacy are published but
  empty, and checkout links to the Terms. _(QA)_
- [ ] **10. The site isn't branded with the school.**
  - The footer shows CourseLit's tagline and copyright.
  - Product cards use the CourseLit logo as the placeholder image.
  - The learner sidebar says "CourseLit / Storefront".
  - The certificate header says "CourseLit".
  - The sign-in code email is titled "Your CourseLit Sign-in Code".

  _(QA)_
- [ ] **11. The public header shows "Join" when the learner is already signed
  in.** _(QA)_
- [ ] **12. Free courses show "$0.00"** in the catalogue instead of "Free".
  Checkout for a free product also shows "$0.00" and "Complete Purchase".
  _(QA)_
- [ ] **13. Signed-out checkout is misleading.** It says "This community is not
  available for checkout yet" until the learner signs in. _(QA)_
- [ ] **14. A pending join request isn't acknowledged.** After asking to join,
  the learner lands on the feed with the members' welcome banner and "You do not
  have access to any spaces yet". Nothing says the request is pending. _(QA)_
- [ ] **15. The learner sidebar is stale after joining** until a reload. _(QA)_
- [ ] **16. The course page doesn't say it is included with the community
  plan.** _(QA)_
- [ ] **17. A learner can't find where to cancel a subscription.** Purchases
  lists it with no action; cancelling is only on My products.
  _(QA 2026-11-10)_
- [ ] **18. The learner's name is the email prefix.** No name is collected at
  sign-up. _(QA)_

## 3. A creator's first hour

- [ ] **19. No onboarding.** A new account lands on an empty stats board with no
  getting-started checklist. Creating a school doesn't open it. The creator's
  name defaults to the email prefix. See `docs/wip/admin-onboarding-journey.md`.
  _(QA)_
- [ ] **20. Email can go out unedited.** New emails default to "Start writing
  here" with no guard. The mailing address is required, but nothing prompts for
  it during setup. _(QA)_
- [ ] **21. Paid flows can't be tried without real gateway credentials.** There
  is no test mode for creators setting up a school. _(QA)_
- [ ] **22. The first navigation in the admin is slow.** Some pages took 20 to 30
  seconds. _(QA)_
- [ ] **23. Publishing a lesson takes three steps:** open it, switch Publish on,
  then Update. Lessons default to Draft, and the list has no quick publish.
  _(QA)_
- [ ] **24. Community details need an explicit Save** at the bottom of the page.
  Navigating away loses edits with no warning. _(QA)_
- [ ] **25. The contact filters in the UI cover only email, tag, subscription and
  signed up.**
  - Product, community, last active and permission are missing, though
    `apps/api/src/contact-filters.ts` supports most of them.
  - This also limits broadcast and sequence audiences.

  _(Parity)_
- [ ] **26. The product Visibility switch's helper text** stays "Only accessible
  via direct link" whichever way it is set. _(QA)_
- [ ] **27. The creator isn't signed in on the storefront** and must sign in
  separately as a learner to join their own community. Confirm first: the two
  test tabs may not have shared cookies. _(QA)_
- [ ] **28. There is no testimonials or social-proof block** in the page
  builder. _(QA)_

## 4. Security hardening

- [ ] **29. Move to zod 4.** Zod 3 has no fix for GHSA-mrhx-c7xc-m3w5 (high):
  validating an oversized constrained collection can exhaust memory.
  - The API, storefront and `api-contract` pin zod 3.25.76.
  - So do ts-rest, the patched `@anatine/zod-openapi` and our `@codelitdev/*`
    packages, and they all need zod 3.
  - This is a migration, not a version bump.

  _(Audit)_

## 5. Missing compared with `main`

- [ ] **30. Confirm the two changes made on purpose.**
  - One community per school instead of many, with no public `/communities`
    list (`apps/api/docs/one-community-per-school.md`).
  - Course discussions are one community space per course, not one per lesson.

  _(Parity)_
- [ ] **31. Pinning community posts.** The API supports it and the feed shows a
  "Pinned" badge, but no screen sets it. _(Parity)_
- [ ] **32. Unpublishing a blog post.** There is no endpoint or button.
  _(Parity)_
- [ ] **33. A tag management page:** counts, delete a tag, untag everyone.
  _(Parity)_
- [ ] **34. Reply by email** to discussions and community posts. See
  `docs/wip/community-replies-from-email.md`. _(Parity)_
- [ ] **35. Per-school Google login** with the school's own client ID and secret,
  and per-school toggles for login methods. Google login is now platform-wide,
  set by env vars. _(Parity)_
- [ ] **36. SAML SSO login.** _(Parity)_
- [ ] **37. Editing a comment.** It exists in the API only. _(Parity)_
- [ ] **38. A share button on community posts.** _(Parity)_
- [ ] **39. A "Downloaded" column for download products.** _(Parity)_
- [ ] **40. The list of contacts in a sequence.** Only the count is shown.
  _(Parity)_
- [ ] **41. A "From" name for each sequence.** _(Parity)_
- [ ] **42. Subscription ID and payment method in the community member list.**
  _(Parity)_
- [ ] **43. Unsplash in page-builder blocks.** Today it is in the community image
  and rich text only. _(Parity)_
- [ ] **44. A version or about page.** _(Parity)_

## 6. Roadmap against competitors

- [ ] **45. Discount codes.** Every competitor has them. Issue #839.
- [ ] **46. Outbound webhooks and Zapier.** Without them creators can't connect
  CourseLit to their other tools. Issue #843 (relates to #645 and #636).
- [ ] **47. Getting members into the community.** Admins can already invite a
  person by email onto a plan (the Invite button on Members). Still missing:
  - a shareable invite link;
  - CSV import;
  - member search on the Members tab.
- [ ] **48. Community moderation tools:**
  - bulk approve and reject;
  - mute or ban a member;
  - content rules and keyword filters;
  - moderator permissions for each space.
- [ ] **49. Trials and coupons on community plans.** Standard in Kajabi and
  Circle.
- [ ] **50. Order bumps and upsells at checkout.** Bundles already exist, so this
  is a short step. Issue #841 (relates to #426).
- [ ] **51. Onboarding new community members.** Today there is a welcome banner.
  Still missing:
  - a welcome post or onboarding checklist;
  - profile prompts;
  - automated welcome messages.
- [ ] **52. Affiliate program.** A growth lever on Kajabi, Teachable and Podia.
  Issue #840.
- [ ] **53. Importers from Teachable, Kajabi and Thinkific.** Switching cost is
  the main thing stopping creators from moving.
- [ ] **54. Tax handling.** LemonSqueezy is the merchant of record, so it covers
  this. Stripe and Razorpay schools are on their own.
- [ ] **55. Live sessions:**
  - events and a calendar, including a calendar space in the community;
  - coaching bookings;
  - webinars through Zoom or a link.

  This is Circle's and Kajabi's moat, and cohort courses depend on it. Issue
  #842 (relates to #390).
- [ ] **56. Community analytics:** active members, posts per week, pending
  requests over time, churn.
- [ ] **57. Engagement tools:**
  - chat or DMs;
  - challenges;
  - gamification (points, levels, leaderboards);
  - polls;
  - digests.
- [ ] **58. Multiple communities per school, and groups of spaces with access
  set for each space.** Only if item 30 reverses the decision to have one
  community per school.
- [ ] **59. A member directory.**
- [ ] **60. A native mobile app, or at least a PWA.**
- [ ] **61. Funnels, and the automation layer** that joins email, access, coupons
  and affiliates.
- [ ] **62. AI drafting of courses and copy.**
- [ ] **63. Podcasts.**

## 7. Maintenance

- [ ] **64. minimatch (moderate) and deepmerge (low).** Both come in only through
  the `shadcn` CLI, a dev tool. They clear when shadcn updates its dependencies.
  _(Audit)_
- [ ] **65. Correct the parity ledger.**
  `docs/platform-rewrite-parity-ledger.md` (COM-002) says the admin has pin and
  unpin controls. It doesn't; see item 31.

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
