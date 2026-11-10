# Complete rewrite: what's still missing

Tracker for the gaps between the rewrite and the creator-commerce platforms it
competes with (Kajabi, Circle, Podia, Teachable). Tick an item when it ships.

The competitor details come from general knowledge of those products as of
mid-2026, not a fresh look at them. Treat them as approximate. Before building
anything below, check `main`, which may already have it.

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

## Commerce gaps (in priority order)

- [ ] **Discount codes.** Every competitor has them. Issue #839.
- [ ] **Affiliate program.** A growth lever on Kajabi, Teachable and Podia.
  Issue #840.
- [ ] **Order bumps and upsells at checkout.** Bundles already exist, so this
  is a short step. Issue #841 (relates to #426).
- [ ] **Tax handling.** LemonSqueezy is merchant of record, so it covers this.
  Stripe and Razorpay schools are on their own.
- [ ] **Importers** from Teachable, Kajabi and Thinkific. Switching cost is the
  main thing stopping creators from moving.
- [ ] **Trials and coupons on community plans.** Standard in Kajabi and Circle.

## Live and coaching

- [ ] **Live sessions:** events, a calendar, coaching bookings, and webinars
  through Zoom or a link. Circle's and Kajabi's moat, and cohort courses depend
  on it. Issue #842 (relates to #390).

## Integrations

- [ ] **Outbound webhooks and Zapier.** Without them creators can't connect
  CourseLit to their other tools. Issue #843 (relates to #645 and #636).

## Community gaps

The community is one per school, set up in a few steps. It is behind Circle and
Kajabi once it's running. Suggested order:

- [ ] **Getting members in:** admins can already invite a person by email onto a
  plan (the Invite button on Members). Still missing: a shareable invite link,
  CSV import, and member search on the Members tab.
- [ ] **Onboarding new members:** a welcome post or onboarding checklist, beyond
  today's welcome banner. Profile prompts and automated welcome messages.
- [ ] **Moderation:** bulk approve and reject; mute or ban a member; content
  rules and keyword filters; moderator permissions per space.
- [ ] **Community analytics:** active members, posts per week, pending requests
  over time, churn.
- [ ] **Events:** simple scheduled sessions or a calendar space (overlaps with
  live sessions above).
- [ ] **Multiple communities per school,** and groups that contain spaces with
  access per space.
- [ ] **Engagement tools:** chat or DMs, challenges, gamification (points,
  levels, leaderboards), polls, digests.

## Later

- [ ] Native mobile app, or at least a PWA.
- [ ] Funnels, and the automation layer that joins email, access, coupons and
  affiliates.
- [ ] Podcasts.
- [ ] AI course and copy drafting.
- [ ] A member directory.

## Done: launch blockers in the core product and community loop

Fixed and covered by regression tests (`commerce-webhooks.test.ts`,
`commerce-receipts.test.ts`, `community-billing.test.ts`). Commit 9dc5a1d8.

- [x] First subscription charge counted once; renewals reach their checkout;
  refunds, partial refunds, cancellation and expiry handled on all three
  gateways.
- [x] Learners can cancel a product subscription; creators can cancel it or
  remove access.
- [x] Removing a paying community member cancels their billing first.
- [x] Learners can leave a community.
- [x] A learner who already has access can't buy the same product again.
- [x] Download buyers see the download button wherever the product opens.
- [x] One receipt per payment, a learner Purchases page, a new-sale
  notification, and platform mail as a fallback when a school has no mail setup.

## Gaps from the creator and learner walkthrough (QA, 2026-11-03)

Found by signing up as a creator, building a course and an approval-only
community, then joining and taking the course as a learner.

### Bugs (fixed, awaiting commit and deploy)

- [x] Approving a join request didn't grant the plan's included courses.
- [x] `/join` ignored the community sales page edits; it now serves that page.
- [x] The sales page said "Join for free" and checkout said "Complete Purchase"
  for approval-only communities; both now say "Request to join".
- [x] Activating a sequence without a mailing address failed with a vague error;
  it now says to add the address in Mails → Settings.

### Creator journey

- [ ] **No onboarding.** A new account lands on an empty stats board with no
  getting-started checklist. Creating a school doesn't open it. The creator's
  name defaults to the email prefix.
- [ ] **Placeholder content goes live.** The default homepage ships the
  CourseLit promo video, "Ask user to take action", a "default page created for
  you" notice and generic feature-grid copy. Terms and Privacy are published but
  empty, and checkout links to the Terms.
- [ ] **School branding missing.** The footer shows CourseLit's tagline and
  copyright, not the school's. Product cards use the CourseLit logo as the
  placeholder image.
- [ ] **Email can go out unedited.** New emails default to "Start writing here"
  with no guard. The mailing address is required but nothing prompts for it
  during setup.
- [ ] **Publishing a lesson takes three steps** (open it, switch Publish on,
  Update). Lessons also default to Draft with no quick publish in the list.
- [ ] **Confusing switch copy.** The product Visibility switch's helper text
  stays "Only accessible via direct link" whichever way it is set.
- [ ] **Community details need an explicit Save,** at the bottom of the page.
  Navigating away loses edits with no warning.
- [ ] **No testimonials or social-proof block** in the page builder.
- [ ] **Paid flows can't be tried without real gateway credentials.** No test
  mode for creators setting up a school.
- [ ] **Slow first navigation in the admin** (some pages took 20 to 30 seconds).

### Learner journey

- [ ] **A pending request isn't acknowledged.** After asking to join, the
  learner lands on the feed with the members' welcome banner and "You do not
  have access to any spaces yet", with nothing saying the request is pending.
- [ ] **Signed-out checkout is misleading.** It says "This community is not
  available for checkout yet" until the learner signs in.
- [ ] **The portal isn't branded with the school.** The learner sidebar says
  "CourseLit / Storefront" and the certificate header says "CourseLit". The
  public header shows "Join" even when signed in.
- [ ] **Free courses show "$0.00"** in the catalogue instead of "Free".
- [ ] **The course page doesn't say** it is included with the community plan.
- [ ] **Learner name is the email prefix;** no name is collected at sign-up.
- [ ] **The creator isn't signed in on the storefront** and must sign in
  separately as a learner to join their own community (not confirmed: the two
  test tabs may not share cookies).
- [ ] **The learner sidebar is stale after joining** until a reload.

### What worked

Community setup with live preview; the Members screen (the answer to the join
question, approve and reject, roles); the sequence editor and its triggers; the
feed composer; the course player with progress; certificates.

## Parity gaps vs `main` (2026-11-10)

Things `main` (v0.74.4) does that the rewrite doesn't. Found by reading the
code on both branches, not by running them. The item-by-item comparison is in
`docs/platform-rewrite-parity-ledger.md`.

### Before launch

- [ ] **Contacts list loads only the first 100 contacts** and filters them in
  the browser (`apps/admin/app/contacts/page.tsx`). Counts and search are wrong
  for bigger schools.
- [ ] **Image upload inside page-builder blocks is broken.** The builder's
  `ImageUploadDialog` gets no upload adapters and the admin never mounts a
  `MediaUploaderProvider`, so uploading throws. Pasting a URL may still work.
- [ ] **Contact filters in the UI cover only email, tag, subscription and
  signed up.** Product, community, last active and permission are missing,
  though `apps/api/src/contact-filters.ts` supports most of them. This also
  limits broadcast and sequence audiences.
- [ ] **The generic "Email signup" and "Support form" page blocks say they
  succeeded but save nothing.** They need `teamId` and `publicApiBaseUrl`, which
  the storefront never passes. The CourseLit "Newsletter signup" block works.
  Not confirmed at runtime.

### Missing features

- [ ] SAML SSO login.
- [ ] Per-school Google login (the school's own client ID and secret) and
  per-school toggles for login methods. Google is now platform-wide, set by env
  vars.
- [ ] Pinning community posts. The API supports it and the feed shows a
  "Pinned" badge, but no screen sets it.
- [ ] Reply by email to discussions and community posts (see
  `docs/wip/community-replies-from-email.md`).
- [ ] A tag management page: counts, delete a tag, untag everyone.
- [ ] Unpublishing a blog post: there's no endpoint or button.
- [ ] Smaller ones: a "Downloaded" column for download products; editing a
  comment (API only); subscription ID and method in the member list; a share
  button on community posts; the list of contacts in a sequence (count only);
  a per-sequence "From" name; Unsplash in page-builder blocks (community image
  and rich text only); the version/about page.

### Changed on purpose (confirm)

- [ ] One community per school instead of many, and no public `/communities`
  list (`apps/api/docs/one-community-per-school.md`).
- [ ] Course discussions are one community space per course, not per lesson.

## Dependency audit (`bun audit`, 2026-11-10)

Commit f142df23 fixed both criticals and all but one high.

- [ ] **Move to zod 4.** Zod 3 has no fix for GHSA-mrhx-c7xc-m3w5 (high:
  validating an oversized constrained collection can exhaust memory). The API,
  storefront and `api-contract` pin zod 3.25.76. So do ts-rest, the patched
  `@anatine/zod-openapi` and our `@codelitdev/*` packages, which all need zod
  3, so this is a migration rather than a version bump.
- [ ] minimatch (moderate) and deepmerge (low). Both come in only through the
  `shadcn` CLI, a dev tool; they clear when shadcn updates its dependencies.

## Not yet verified

- [ ] Paid checkout, receipts, sale alerts, cancellation and refunds against
  real Stripe, LemonSqueezy and Razorpay test accounts. The 2026-11-03 QA smoke
  test could only cover free plans.
- [ ] Stripe accounts on the March 2025 API or later: a refund of the first
  subscription charge may not be matched, because the newer API drops the
  charge-to-invoice link.
- [ ] Webhooks that can't be tied to a school return an error, so the gateway
  retries and may eventually disable the endpoint.
- [ ] The real Turnstile challenge in a normal browser. The automated browser
  couldn't complete it.
- [ ] A file download end to end. The QA test product had no file attached.
