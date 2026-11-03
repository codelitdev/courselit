# CourseLit admin onboarding: user journey and design brief

This brief is for designing the screens of a new onboarding wizard for the
CourseLit admin app. It is self-contained: it explains the product, the current
admin, what goes wrong today and the journey we want. It describes what the
creator does and what the product does in response, not how the screens look.
Layout and visual design are yours to propose.

---

## 1. Product context

**CourseLit** is a platform for creators (teachers, coaches, artists) to sell
online courses, digital downloads and paid communities from their own website.
It competes with Kajabi, Teachable, Podia and Circle.

### Key concepts

- **Creator:** the person who signs up and runs a school. They are the user of
  this wizard.
- **School:** a creator's business on CourseLit. Each school has:
  - its own public website (the "site")
  - its own learners, products and community
  - its own branding
  
  One account can own several schools and switch between them.
- **Site:** the school's public website at `<address>.courselit.app`, or at a
  custom domain later. It has a homepage, product pages, a blog, Terms and
  Privacy pages, and a signed-in area where learners take courses and use the
  community.
- **Learner:** someone who signs up on a school's site to buy, join or learn.
  Learners never see the admin app.
- **Products:** two kinds.
  - **Course:** lessons that can be text, video, audio, PDF, file, embed, quiz
    or SCORM. Lessons can be released on a schedule. Completing a course can
    issue a certificate.
  - **Download:** one or more files the learner gets after buying or signing up.
    A free download works as a lead magnet.
- **Community:** each school has exactly one community.
  - It has **spaces** (like channels) with a feed, posts, comments and
    reactions.
  - Joining can be **instant** or **by request**. With requests, the creator
    sets a question that applicants answer, then approves or rejects them.
- **Plans:** how a product or the community is priced: **free**, **one-time**,
  **subscription** or **instalments**. A community plan can **include courses**,
  which members get automatically.
- **Payments:** the school connects **its own** Stripe, Razorpay or
  LemonSqueezy account by pasting API keys.
  - Learner payments go straight to the creator, with no CourseLit cut.
  - Free plans work without any payment setup.
- **Email:** each school can send broadcasts and automated sequences (for
  example a welcome series) to its contacts.
  - Anti-spam law requires a **physical mailing address** in every marketing
    email.
  - Email can't be sent until the school has one.
- **Page editor:** a full-screen visual editor for the site's pages, built from
  themeable blocks (hero, product grid, text, media, call to action and so on).
  Every product and the community also has its own editable sales page.
- **AI assistant connection (MCP):** CourseLit has an MCP server, so a creator
  can connect an AI assistant to their school and work through chat.
  - Supported assistants include Claude, ChatGPT and Cursor, plus any other
    MCP-capable client.
  - The creator adds one CourseLit address to the assistant, then signs in with
    their CourseLit account in a browser window.
  - Alternatively, they create an **API key** for one school in Settings and
    paste it in.
  - Once connected, the assistant can, for example:
    - create and edit products
    - draft and apply a whole course outline (sections and lessons)
    - manage contacts
    - organise media
    - reach anything else the admin can do through the CourseLit API
  - It acts with the creator's own permissions on the school they choose.
- **CourseLit subscription (hosted version only):** the creator pays CourseLit
  for the school on a **Pro** or **Business** plan, monthly or yearly, possibly
  with a free trial. They pay through a CourseLit checkout page when creating
  the school. The self-hosted open-source version has no plans and no payment
  step.

### Brand rule

Copy must only ever say **CourseLit**. Never name internal infrastructure (mail
provider, site builder or media service) in anything the creator sees.

---

## 2. The admin app today

Use this as a reference for the shell and visual language the wizard should fit
into.

### Layout

- A left sidebar and a main content area with a breadcrumb bar at the top.
- **Sidebar, top:** the school switcher (school name and its site address).
- **Sidebar, main navigation:**
  - Overview
  - Products
  - Community
  - Spaces
  - Website: Pages, Blog, Domain
  - Contacts
  - Mails: Broadcasts, Sequences, Templates, Settings
- **Sidebar, bottom:** Support, Media library, Settings, and the account menu
  (avatar, name, email).
- **Settings tabs:** Branding, Code injection, Domain, Mail delivery, Payments,
  Team, Notifications, API keys.
- **No screen for connecting an AI assistant yet.** The MCP server works, but
  the admin never mentions it. The creator would need the address from
  documentation. This brief adds a place for it (see step 4 and section 7).
- **Overview:** sales and learner statistics for the school.

### Visual style

- **Colours:** a warm off-white background, white cards with subtle borders and
  rounded corners, and a coral or terracotta accent for primary buttons, active
  navigation and highlights.
- **Type:** Hanken Grotesk for text and Spline Sans Mono for code.
- **Components:** shadcn/ui-style cards, fields, tabs, switches and dialogs.
- **Status badges:** small pills with a dot, such as "Active" in green and
  "Waiting" in amber.
- **Feel:** calm and friendly, not dense.

### Sign-in

- The creator enters an email address and gets a 6-digit code by email. A bot
  check runs on the form.
- There is no password. Google sign-in may come later.
- Sign-in happens **before** the wizard and is not part of this brief.

### School creation today

- A dialog asks for:
  - **Name**, for example "Acme Academy".
  - **Subdomain**. It's generated from the name and editable. It must be 3 to 63
    characters, using lowercase letters, numbers and single hyphens.
- **Hosted only:** the dialog also asks for a **Plan** (Pro or Business) and a
  **Billing interval** (monthly or yearly), showing the price and any trial. The
  button reads "Continue to checkout", which goes to a CourseLit payment page
  and returns afterwards.
- **Errors:** the subdomain is taken, the prices changed (ask to retry), or
  checkout is unavailable.
- Currency (default USD) and language (default English) are set behind the
  scenes and can be changed in Settings.
- On creation, CourseLit provisions the school in a few seconds:
  - its website, with a default homepage and Terms and Privacy pages
  - its community, disabled until the creator enables it
  - its email setup

---

## 3. What goes wrong today

These came from walking through sign-up as a new creator:

1. **No guidance.** After sign-in, a new account lands on an empty statistics
   page with nothing telling them what to do.
2. **Creating a school doesn't open it.** The creator has to find and switch to
   it.
3. **Name is the email prefix.** The creator's name defaults to the part of
   their email address before the @ ("maya.creator"), and nothing asks for a
   real name.
4. **Placeholder content goes live.**
   - The default homepage shows a CourseLit promo video, "Ask user to take
     action" and generic copy.
   - Terms and Privacy are published empty, yet checkout links to Terms.
5. **CourseLit branding on the school's site.** The footer shows CourseLit's
   tagline and copyright, and product cards use the CourseLit logo as a
   placeholder image.
6. **Email fails late.** A mailing address is required, but nothing asks for it
   until the creator tries to start an email sequence and it fails.
7. **Publishing takes too many steps.**
   - Lessons default to draft, and publishing one means opening it, switching
     Publish on and saving.
   - The community details need an explicit Save at the bottom of a long page.
8. **Paid offers can't be tried without real gateway keys.**
9. **The AI assistant connection is invisible.** Creators who already work in
   Claude or ChatGPT don't learn they could build their course from there.

---

## 4. Goal

In one sitting, starting right after sign-in, the creator ends up with a public
site that:

- shows **their** school's name and branding, with no CourseLit placeholder
  content
- has **one real offer** (a course, the community or a download) that a learner
  can buy or join
- can **send email**

Everything else (custom domain, team, sequences, blog) is for later, and is
reached from a **checklist** on Overview instead of the wizard.

## 5. Principles

- **Short.** Ask only for what the first offer needs. Every step after creating
  the school can be skipped.
- **Real content only.** Nothing goes live with sample copy. A section with no
  data is hidden instead of showing a placeholder.
- **Resumable.** Leaving midway keeps what was entered. The next sign-in
  resumes the wizard.
- **Shows the result.** Steps that change the public site show a live preview
  of it.
- **Nothing is final.** Every choice can be changed later in the normal admin
  screens.
- **One brand.** Only "CourseLit" and the school's own name appear.

---

## 6. The journey

The wizard starts after sign-in. It runs when the account has no school, and
when the creator chooses to create another school.

Invited team members never see it. They land in the school they were invited
to.

### Step 1. About you

- **Your name**, required. It's used in emails, on the community and on
  certificates.
- Shown only on the account's first run. It's skipped when they create a
  second school.

### Step 2. Name your school

- **School name**, required.
- **Site address** (the subdomain): suggested from the name, editable, with a
  live availability check and the full URL shown, for example
  `acme-academy.courselit.app`. It must be 3 to 63 characters, using lowercase
  letters, numbers and single hyphens.
- **Currency** and **language**: prefilled from the browser and editable.
  Currency matters because it sets the prices learners see.
- **Hosted only: choose a CourseLit plan.**
  - Pro or Business, monthly or yearly, with prices and any trial.
  - Continuing goes to the CourseLit checkout page.
  - Coming back from checkout resumes the wizard at the next step.
  - A cancelled checkout returns here with the choices kept.
- On submit, the school is created and set up. Show a short progress state
  covering the website, community and email, because it takes a few seconds.
- If setup partly fails, show which part and offer **Retry**.
- When done, the new school opens automatically.

### Step 3. What do you want to offer first?

- Choose one:
  - **A course** ("Teach with lessons and videos")
  - **A community** ("Bring people together, free or paid")
  - **A download** ("Sell or give away files")
- This choice decides step 4 and the order of the checklist.
- "I'll decide later" skips straight to step 5.

### Step 4. Set up your first offer

The form depends on the choice in step 3.

**A course**
- Title and short description.
- Cover image, optional.
- First lesson: a title, then either text or a video. It's created as
  published.
- Price: **Free**, or **Paid** with an amount (one-time). Subscriptions and
  instalments are set up later in the product screen.

**A community**
- Name and description, prefilled from the school name.
- Who can join: **Anyone, instantly** or **By request**. With requests, add the
  question applicants answer, for example "What do you want to make?".
- Price: **Free**, or **Paid** (monthly or one-time).
- Optionally pick a course to include for members, if one exists.
- A short welcome message that new members see.

**A download**
- Title and description.
- File upload.
- Price: **Free** (shown as a good lead magnet) or **Paid** with an amount.

**Or: build it with your AI assistant.**
- A secondary option on this step, for example "Prefer to build it in chat?
  Connect your AI assistant".
- It opens a **Connect your AI assistant** panel:
  - Pick the assistant (Claude, ChatGPT, Cursor or Other), and see short steps
    for that app, ending in "sign in with CourseLit when asked".
  - The **CourseLit MCP address**, with a Copy button.
  - For clients that need a key instead: **Create an API key for this school**,
    shown once with a Copy button.
  - A suggested first prompt to paste, tailored to the choice in step 3. For
    example: "Create a course called *…* for beginners, with 5 sections and 3
    lessons each, and draft the first lesson."
- The panel shows **Waiting for your assistant…** and switches to
  **Connected** when the assistant first connects.
- When the assistant creates a product, the wizard picks it up, shows it as the
  first offer, and lets the creator continue to step 5.
- "Back to the form" returns to the normal fields at any time.

At the end of the step the offer is published and gets a sales page built from
what was entered. If it's paid, it's saved as a draft until payments are
connected in step 6.

### Step 5. Make the site yours

- **Logo**, optional.
- **Brand colour**, or a choice of a few theme presets.
- **Tagline**: one line about the school.
- **Live preview** of the homepage, built only from real data: the school name,
  tagline, logo, and the offer from step 4 if there is one. There is no sample
  copy, video or stock text.
- The site's footer shows the school name and its own copyright.

### Step 6. Get paid

Shown only when the offer from step 4 is paid.

- Choose **Stripe**, **Razorpay** or **LemonSqueezy**.
- Paste the account's keys, with a "Where do I find these?" help link for each
  provider.
- One line of reassurance: "Payments go straight to your account. CourseLit
  takes no cut."
- **Set this up later**: the paid offer stays a draft, and the checklist shows
  "Connect payments to publish *Offer name*".

### Step 7. Email

- **Mailing address**, required by anti-spam law. Explain it in one sentence,
  and say it appears in the footer of marketing emails.
- **Sender name**, defaulted to the school name.
- **Skip for now**: email stays off and the checklist says so.

### Step 8. You're live

- A celebratory confirmation.
- The **site URL**, with **Copy** and **Open site** buttons.
- A **share link** for the offer: the course page, or the community's `/join`
  page.
- **Your AI assistant**: if not connected yet, a small card reading "Manage
  your school from Claude, ChatGPT or Cursor" with **Connect**, which opens the
  same panel as step 4.
- **See it as a learner**: opens the site so the creator can try signing up
  themselves.
- **Go to your dashboard**: lands on Overview with the checklist.

---

## 7. The checklist on Overview

A card at the top of Overview until it's complete or dismissed.

- Each item has a short line of why it matters and a button to the screen
  where it's done.
- Items tick themselves off when the work is actually done, for example once a
  payment account is connected.
- It shows progress, for example "3 of 9".
- It can be dismissed, and brought back from the Overview menu.

Items, in rough order. Items left over from skipped wizard steps come first.

- [ ] Connect payments (if a paid offer is waiting)
- [ ] Add your mailing address
- [ ] Write your Terms of use and Privacy policy. They start as unpublished
  drafts. The footer and checkout only link to them once they're published.
- [ ] Add more lessons to your course
- [ ] Edit your homepage (opens the page editor)
- [ ] Invite your first learners
- [ ] Set up a welcome email
- [ ] Connect your AI assistant (Claude, ChatGPT, Cursor and others)
- [ ] Connect your own domain
- [ ] Invite a team member

The connect panel also needs a permanent home outside the wizard. Suggested:
**Settings → AI assistants**. It would show:
- the MCP address
- connected assistants, with when each last connected and a **Disconnect**
  button
- a link to API keys

---

## 8. Screens and states to design

- **Wizard shell:** progress indicator, Back, Skip and Continue, and a way to
  exit ("Finish later").
- **For each step:**
  - empty and filled
  - field errors
  - saving
  - a failed save with Retry
- **Step 2:** availability check (checking, available, taken with suggestions).
- **Step 2, hosted:** plan picker, handoff to checkout, return from checkout,
  and a cancelled checkout.
- **Step 2:** setup in progress, and partial failure with Retry.
- **Step 4:** each of the three offer forms, and the upload state for files and
  cover images.
- **Connect your AI assistant panel:**
  - assistant picker and per-app steps
  - copy address
  - API key created (shown once)
  - waiting for the assistant to connect, then connected
  - product detected from the assistant
  - connection failed or timed out, with help
- **Settings → AI assistants:** none connected, some connected, disconnect
  confirmation.
- **Step 5:** live preview, with and without a logo and an offer.
- **Step 8:** confirmation.
- **Overview checklist:** empty, part done, all done, dismissed.
- **Resume:** returning to an unfinished wizard.
- **Mobile:** the whole wizard on a phone. Creators often sign up there.

## 9. Out of scope for the first version

- Importing from Teachable, Kajabi or Thinkific.
- CourseLit's own built-in AI writer. AI drafting happens through the
  creator's own assistant over MCP (step 4).
- Choosing a full site template. The homepage is built from data, and the page
  editor is there for more.
- A sandbox or test mode for payments. It's an open question below.

## 10. Open questions

1. Should step 1 also ask what they teach, to tailor copy and suggestions?
2. Should step 3 allow more than one choice, such as a community that includes
   a course?
3. Should there be a payments test mode, so creators can try a paid checkout
   before connecting real keys?
4. Should experienced creators be able to skip the whole wizard?
5. Should connecting an AI assistant be its own wizard step (for example after
   step 5), or stay an option inside step 4 plus a checklist item? This draft
   uses the latter, to keep the wizard short.
6. When an assistant signs in, should the creator choose which school it may
   use on the sign-in screen, or should it default to the current school?
