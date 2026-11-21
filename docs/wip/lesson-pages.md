# Lesson pages: one block-based lesson type

Status (2026-11-21): steps 1–3 done (step 2 in #899, step 3 stacked on it);
steps 4–5 next.

Today a lesson has one of eight fixed types (`text`, `video`, `audio`,
`pdf`, `file`, `embed`, `quiz`, `scorm`) and the type can't change. This
change replaces the six content types with one **Page** lesson: a document
where the author places blocks (text, video, audio, PDF, file, embed,
callout, quiz) in any order. SCORM stays its own type, and digital-download
items keep a `file` record that isn't offered as a lesson type.

The editor and its document format come from `@frontlit/text-editor`
(Tiptap), which CourseLit's text lessons already use and which FrontLit's
docs already drive over REST and MCP with Markdown. The generic parts are
built there first (AGENTS.md: package-first).

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Lesson types | `page` and `scorm`. Download products keep `file` items, which the lesson-type picker never shows. |
| Page content | A Tiptap document, stored as Tiptap JSON and validated on the server. |
| API format | Writes take **either** `content` (Tiptap JSON) **or** `markdown`. Rich blocks are JSX-style tags, as in FrontLit docs. |
| Editor | `@frontlit/text-editor` with pluggable blocks, a `/` insert menu and drag handles, added in FrontLit first. |
| Quiz | A block. **At most one Quiz per Page.** There is no quiz lesson type. |
| Completion | "Mark complete" is a separate button the learner presses on purpose. The API refuses it until the page's quiz has a passed attempt. Passing never completes the page by itself. |
| Correct answers | Never sent to learners. Grading happens only on the server. |
| Media | Blocks reference uploaded media by ID; the API checks ownership. Images may also use Unsplash URLs, which never enter the media library. |
| Turning blocks off | Remove from the format (profile), or mark unavailable per school or plan (3.3). Plan gating uses the second. |
| Backwards compatibility | None needed. Rewrite the original migration, reset, re-apply. The main-data import maps old lessons into pages (section 8). |

## 2. Why this shape

Research (2026-11-20) on Teachable, Thinkific, Kajabi, Podia, LearnWorlds,
Articulate Rise, LearnHouse, Circle and Skool:

- Teachable (about 14 blocks, one quiz block per lesson), Thinkific's new
  course builder, Podia (a Notion-style "Lesson" with a `/` menu) and Rise
  (60+ blocks) use block-based lessons. Kajabi and LearnWorlds don't.
- Platforms that put a graded quiz inside a lesson allow only one, so
  grading and completion have a single source.
- Inline knowledge checks, flashcards and "Continue" gates (Rise) are what
  make a lesson interactive; none of the course-business platforms has
  them yet.
- No competitor lets developers add block types.

`@frontlit/text-editor` over SendLit's email editor: a lesson is a flowing
document like a docs page, while an email is a stack of email-safe rows
with its own styling. FrontLit's editor already has a Markdown round trip,
server validation with diagnostics and a themeable renderer.

## 3. Changes in `@frontlit/text-editor` (FrontLit repo)

Today the package has two hard-coded profiles, `createExtensions()` and
`createDocsExtensions()`, with the docs blocks wired into
`docs/markdown.ts` and `docs/validate.ts` by name.

### 3.1 Block definitions and profiles

A block is described once; every layer is built from a list of them.

```ts
// Server-safe (no React): "@frontlit/text-editor/blocks"
interface BlockSchema<Attrs> {
  name: string;                 // Tiptap node name: "video"
  tag: string;                  // Markdown tag: "Video"
  content?: string;             // child content expression; atom when absent
  attrs: AttrSpec<Attrs>;       // validator, default and description per attribute
  toMarkdown?(attrs, children): MdxJsxFlowElement;  // only for nested-tag forms (Quiz)
  fromMarkdown?(element, ctx): JSONContent;
  validate?(node, ctx): Diagnostic[];
  docs: { summary: string; example: string };       // feeds the API format reference
}

// Browser: "@frontlit/text-editor"
interface BlockUi<Attrs> {
  schema: BlockSchema<Attrs>;
  insert: { label: string; icon: Icon; keywords: string[]; create(): JSONContent };
  view?: NodeViewComponent<Attrs>;
  settings?: SettingsComponent<Attrs>;
}
```

A **profile** is base nodes + blocks + limits. From it the package builds
the schema, Markdown parser and serializer, validator, editor extensions
and renderer. The default and docs profiles are rebuilt on this, and the
existing docs fixtures and tests must pass unchanged. The renderer takes
host components per block (`TextRenderer blocks={{ quiz: LearnerQuiz }}`)
for blocks with learner state.

### 3.2 What ships in the package

| Tier | Contents |
|---|---|
| Base nodes (on unless removed) | paragraph, headings, lists, quote, code block, divider, table, link, hard break; marks bold, italic, strike, code, highlight |
| Block library (off unless listed) | Image, Video, Audio, PDF, File, Embed, Callout, Tabs, Accordion, Steps |
| Docs profile (`src/docs/`) | Cards, Code group, Type table, frontmatter |

Callout, Tabs, Accordion and Steps move from the docs profile into the
library; docs Markdown doesn't change. Product blocks stay in the product
(Quiz lives in CourseLit).

Media blocks hold a `media` ID or, where the profile allows, an `https`
URL from an allowed host list. The package never fetches media: the host
supplies the editor's picker and the renderer's `resolveMedia(id)`.

### 3.3 Turning blocks off

**Profile (what the format can hold).**

```ts
const lessonProfile = defineProfile({
  base: { exclude: ["table"], headings: { levels: [2, 3, 4] } },
  blocks: [image({ hosts: ["images.unsplash.com"] }), video(), audio(), pdf(), file(), embed(), callout(), quiz],
});
```

Base nodes and marks are removed with `exclude`; library blocks are left
out of the list; options narrow a block instead of copying it. `doc`,
`paragraph` and `text` can't be removed, and removing a parent removes its
children. A removed block is gone from every layer: Markdown or JSON
containing it fails with `block_not_allowed`, pasted HTML is converted by
the schema, and the format reference never lists it.

**Availability (what may be added now).**

```ts
<Editor profile={lessonProfile} unavailable={{ embed: "plan_required" }} />
validateContent(lessonProfile, next, { previous, unavailable: { embed: "plan_required" } });
```

The block stays in the format, so existing ones keep rendering and
editing. The editor greys it out with the reason; the validator refuses an
increase in its count over `previous` (the stored version, never one the
client sends). This serves plan gating and any per-school switch.

### 3.4 Editing

`/` insert menu from `insert` entries, drag handles, a settings popover
per block, and `ImagePickerContextProvider` widened into a media picker
for any file type.

### 3.5 Package boundary

The package stays in the FrontLit repo (decided 2026-11-20). The generic
core never imports from `src/docs/`, enforced by a lint rule or test, so
the core can move to `@codelitdev/text-editor` later (with a platform ADR)
if a third product needs it.

## 4. The lesson profile (CourseLit)

A new workspace package, `packages/lesson-content`, holds the lesson
profile for the API, admin and storefront.

### 4.1 Blocks in v1

| Group | Blocks |
|---|---|
| Text | paragraph, headings 2–4, lists, quote, code block, table, link, divider |
| Media | Image (media ID or Unsplash URL), Video (media ID or a YouTube or Vimeo URL), Audio, PDF, File (download) |
| Other | Embed, Callout, Quiz |

Each media block accepts only its MIME family (reuse
`lessonMediaValidation`). A Video with a YouTube or Vimeo URL renders the
provider's player from a fixed embed URL built from the video ID; the
author's input never becomes HTML. To offer a video or PDF as a download, add a File
block for the same media; the lesson-level `downloadable` flag goes away.

Later: Tabs, Accordion and Steps (already in the library; they need
storefront renderers), knowledge checks, flashcards, "Continue" gates.

### 4.2 Markdown form

```md
## Why pricing matters

Most creators **undercharge**.

<Video media="med_123" caption="Walkthrough" />

<Callout type="tip">Start with three tiers.</Callout>

<Quiz id="qz_4" passingGrade={70}>

<Question id="q1" text="Which tier anchors the price?">

<Option id="o1" text="The top tier" correct />

<Option id="o2" text="The middle tier" />

</Question>

</Quiz>
```

That is the canonical form the API returns. On read, a question's text may
also be a paragraph inside `<Question>` (after a blank line), and an option
may be `<Option id="o1" correct>The top tier</Option>` on its own line.
Quiz text is plain text. Underline and highlight are left out of the lesson
profile because Markdown can't hold them.

### 4.3 Validation (server, every write)

- Profile nodes only, attribute validators, limits (section 10, L7).
- At most one Quiz (`quiz_limit`).
- Media IDs belong to the school and match the block's MIME family.
- Missing quiz, question and option IDs are filled in; duplicates are
  refused; the saved document is returned so clients reuse the IDs.
- Errors return `validation_failed` with reason `lesson_content_invalid`.
  Platform error details are flat, so the first diagnostic is spread out
  (`code`, `message`, `fieldPath` or `line`/`column`) and up to 20
  diagnostics are in `diagnostics` as a JSON string.
- Incomplete blocks (a quiz without questions or a correct option) save as
  drafts from JSON, but Markdown writes and publishing refuse them.
- A page holding a quiz can't be a free preview (`quiz_cannot_be_previewed`),
  as quiz lessons couldn't on main: grading needs an enrolled learner.

## 5. Quiz, grading and completion

### 5.1 Quiz block

Attributes: `id`, `passingGrade` (0–100, or none), and
`questions: [{ id, text, options: [{ id, text, correct }] }]`. An atom node
edited by a form; in Markdown, nested `<Question>` and `<Option>` tags. A
question with several correct options is multiple-answer. Scoring: one
point per correct option chosen; a single-answer question accepts at most
one option, and in a multi-answer question each wrong option chosen cancels
a correct one (never below zero), so choosing every option can't pass.
Without a pass mark, every attempt passes.

### 5.2 Answers never reach learners

One function in `packages/lesson-content` drops `correct` from every
option. Learner, public and preview reads return only stripped `content`,
never `markdown`, and use a separate contract type with no `correct`
field, so a missed strip fails type checks and contract tests.

### 5.3 Evaluation

`POST …/lessons/:lessonId/evaluation` takes
`{ quizId, answers: { [questionId]: optionId[] } }` and requires the
lesson's current content to hold a quiz with that ID. `lesson_evaluations`
gains `quiz_id` and keeps a nullable `passing_grade` (the separate
`requires_passing_grade` column goes). Answers by ID survive reordering.

### 5.4 Completion

`completeLesson` refuses a page whose current quiz has no passed attempt
for that quiz ID (`need_to_pass`, existing reason). SCORM is unchanged.
Recorded completion stays when the quiz is edited or removed; a new quiz
(new ID) starts with no attempts. The storefront always shows "Mark
complete" and shows the reason when refused.

### 5.5 What the learner sees after an attempt

Unchanged from today: the score and pass or fail, with unlimited retries.
Which answers were right is never shown. Revealing answers after a pass
would be a separate decision, weighed against L1.

## 6. Plan gating

`scorm-plan.ts` stays. For blocks, CourseLit keeps a map from block name to
plan feature and turns the school's plan into the `unavailable` list (3.3);
the editor package knows nothing about plans. Refusals return `forbidden`
with `plan_required`. The only v1 entry: Embed needs the `code_injection` feature, so it is
unavailable while a school is on its trial (reason `trial`, L4) or has no
plan (`plan_required`); self-hosted installs have every feature, so Embed is
always available there.

## 7. API, MCP and storage

- `lessons.type`: `"page" | "scorm" | "file"`, default `"page"`. Course
  products take `page` and `scorm`; download products take `file` only.
- `lessons.content_version`. Updates send `expectedContentVersion`; a
  mismatch fails with `conflict`, so an agent and a person can't overwrite
  each other.
- Lesson contract: new type enum; writes take `content` or `markdown`, not
  both. The single-lesson admin read and write responses return `content`,
  `markdown` and `contentVersion`; lists return neither content form.
  `mediaId` remains for `scorm` and `file` only.
- `media_references` for a lesson is synced with the document's media IDs
  on save. Learner, public and preview media reads become
  `GET …/lessons/:lessonId/media/:mediaId` (section 10, L5).
- MCP: `create_lesson` and `update_lesson` keep their names; their
  descriptions say to send Markdown. A new read-only operation,
  `getLessonContentFormat` (`get_lesson_content_format`), returns the block
  reference for the school, including unavailable blocks and why.
  `apply_course_outline` creates pages from Markdown.

## 8. Main-data import

`apps/api/src/migrations/products.ts`:

| Main | New |
|---|---|
| text | page; main's Tiptap doc normalized to the profile (unknown nodes become paragraphs; base64 images dropped and reported) |
| video, audio, pdf | page with one matching media block, plus a File block when main marked it downloadable |
| embed | page with one Embed block; a bare YouTube or Vimeo URL (which main played as a video) becomes a Video block |
| quiz | page with one Quiz block; IDs generated; pass mark carried over |
| file | page with a File block in a course; `file` in a download product |
| scorm | scorm |

Media blocks start empty, since lessons with media are still refused until
MediaLit media is imported. Images that aren't on Unsplash become links;
what the import changed is reported per lesson in the run's `warnings`.

## 9. Later

- Knowledge checks as their own block (`Check`), any number per page,
  answered in the browser and never recorded.
- Tabs, Accordion, Steps, flashcards, a "Continue" gate.
- Self-hosted custom blocks: packages exporting `BlockSchema` and
  `BlockUi`, listed in build-time config. Unknown stored blocks render a
  placeholder and are kept on save. Runtime blocks, if ever, only in
  sandboxed iframes (L11).
- Block-based completion rules, drafts for published lessons, AI drafting
  and quiz generation.

## 10. Security requirements

- **L1 Answers.** Correct answers never leave the server for learner,
  public or preview requests: stripped `content` only, no `markdown`, a
  contract type without `correct`. Anything else derived from lesson
  content for learners (excerpts, search, notifications, AI features)
  starts from the stripped document.
- **L2 Server-side rules.** Grading, completion and availability counts run
  on the server against stored content. The version check and the write
  are one statement (`UPDATE … WHERE content_version = $expected`).
- **L3 Embed sandbox.** Embeds render only in a `srcdoc` iframe with
  `sandbox="allow-scripts allow-popups allow-forms"` and **never**
  `allow-same-origin` (a `srcdoc` frame inherits the parent's origin), in
  both admin and storefront, as `embed-viewer.tsx` and
  `lesson-authoring.tsx` do today. The resize listener also checks
  `event.source === iframe.contentWindow` and caps the height.
- **L4 Embed is code injection.** Scripts and forms inside a school's
  lesson can phish its learners. Following plan-limits ("code injection
  runs only for the owner" on a trial), Embed is unavailable while a school
  is on its trial (3.3 availability, reason `trial`; decided 2026-11-20).
  The admin shows it greyed out with an upgrade prompt. YouTube and Vimeo
  stay available through the Video block, which needs no custom code.
- **L5 Media.** On write, every media ID is checked for school ownership
  and MIME family. On read, `…/media/:mediaId` requires the media to be in
  the lesson's `media_references` and the lesson's own access rules
  (published, enrollment, drip, preview-token scope) to pass. There is no
  real download protection for streamed media; the File block is a
  convenience, not a control.
- **L6 URLs.** Links: `https`, `http`, `mailto` or relative only; external
  links render with `rel="noopener noreferrer"`. Image URLs: `https` and an
  allowed host (`images.unsplash.com`), so lessons can't load tracking
  pixels from arbitrary hosts. Video URLs: YouTube or Vimeo only, reduced
  to a video ID on write. `data:` and `javascript:` are refused
  everywhere.
- **L7 Limits.** A byte cap on the raw Markdown or JSON before parsing
  (start from `DOCS_LIMITS`: 1 MB, 20,000 nodes, depth 64); at most 100
  questions per quiz and 20 options per question; IDs match
  `[A-Za-z0-9_-]{1,64}`.
- **L8 Markdown.** Only JSX tags with literal props; raw HTML and
  expressions are refused with a diagnostic, as FrontLit docs do.
- **L9 Rendering.** The renderer builds React elements only; no
  `dangerouslySetInnerHTML` outside the embed iframe's `srcdoc`.
- **L10 Attempts.** Attempts are unlimited (as on main) and each score
  reveals something about the answers, so the evaluation endpoint is rate
  limited per membership.
- **L11 Custom blocks.** Build-time custom blocks are trusted code chosen by
  the self-hoster. Runtime blocks, if ever added, run only in sandboxed
  iframes under L3.

## 11. Order of work

Five pull requests. The FrontLit editor changes ship as one PR and one
release, so CourseLit upgrades once.

1. **FrontLit (one PR, one release):** block-definition API and profiles;
   default and docs profiles rebuilt on it (docs behave exactly as before);
   core free of docs imports; `/` insert menu, drag handles and media
   picker; tests; publish `@frontlit/text-editor`.
2. **CourseLit API groundwork (can start alongside 1):** `content_version`
   check, evaluation and completion by quiz ID, per-media read endpoint,
   evaluation rate limit; tests.
3. **CourseLit content and API (after 1 is published):**
   `packages/lesson-content` (profile, Quiz block, answer stripping), type
   enum and migration rewrite, contract, validation, `media_references`
   sync, availability (Embed on trial), `getLessonContentFormat`, MCP
   descriptions, main-data import; tests for L1–L10.
4. **CourseLit editor and storefront:** Page editor in the admin (type
   picker shows Page and SCORM); storefront renderer with page-builder
   primitives, learner quiz and completion reasons.
5. **CourseLit cleanup and docs:** remove obsolete per-type code and tests;
   docs in `frontlit/docs`, with screenshots.
