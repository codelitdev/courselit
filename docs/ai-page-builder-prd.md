# PRD: AI-Assisted Page Builder (Schema-Enforced JSON Generation)

**Status:** Draft
**Owner:** Rajat
**Last updated:** 2026-06-19

---

## 1. Summary

Add an AI capability to the CourseLit page builder where a user types a
natural-language requirement (e.g. _"a landing page for my photography course
with a hero, 3 pricing tiers, and an FAQ"_) and the system generates a valid
page — represented as the existing `WidgetInstance[]` JSON — that strictly
conforms to the settings contract of each `@courselit/page-blocks` block.

The approach is **prompt + schema engineering with schema-enforced JSON output**.
No model fine-tuning. No tool/function-calling orchestration. A single
generation call constrained by a JSON Schema, followed by a validation gate.

## 2. Goals

- Generate a full, valid page from a natural-language prompt.
- Edit/extend an existing page from a prompt (operates on current page JSON).
- Output is **guaranteed structurally valid** against each block's settings
  schema before it reaches the renderer.
- **New page-blocks are supported automatically** — adding a block under
  `packages/page-blocks/src/blocks/` makes it available to the AI with zero (or
  minimal optional) extra work.
- Keep keys/schemas server-side; never expose to the client.

## 3. Non-Goals

- No unconstrained HTML/CSS/JS generation (Google "Generative UI" style). The
  value of CourseLit is the structured, editable, re-renderable
  `WidgetInstance[]`; we preserve it.
- No real model fine-tuning in v1.
- No tool-calling / multi-step agent loop in v1 (explicitly rejected).
- No automatic media/asset generation (images, video). The AI references
  placeholders or leaves media fields empty for the user to fill.

## 4. Background — how pages work today

- A page is an **ordered array of `WidgetInstance`**
  ([packages/common-models/src/widget-instance.ts](../packages/common-models/src/widget-instance.ts)):

    ```ts
    interface WidgetInstance {
        widgetId: string;
        name: string; // matches a block's metadata.name
        deleteable: boolean;
        shared: boolean;
        settings?: Record<string, unknown>;
    }
    ```

- Each block under [packages/page-blocks/src/blocks/](../packages/page-blocks/src/blocks/)
  is self-contained:

    - `metadata.ts` — `name`, `displayName`, `compatibleWith: PageType[]`, `icon?`
    - `settings.ts` — a **TypeScript interface** extending `WidgetDefaultSettings`
      (erased at runtime; no common shape across blocks)
    - `defaults.ts` — default settings values
    - `widget.tsx` — frontend renderer
    - `admin-widget/` — settings editor UI
    - `index.ts` — assembles the `Widget` object

- There is **no common settings interface**. `faq` has `items[]`, `hero` has
  `media`/`youtubeLink`, `pricing` has tiered `Item[]`, etc.
- `metadata.compatibleWith` restricts which blocks are valid for a given page
  type (PRODUCT, SITE, BLOG, COMMUNITY).

**Core problem:** the only description of a block's settings is a TS interface,
which does not exist at runtime. The LLM has no machine-readable target. The
entire system is built to solve this: produce a runtime schema per block.

## 5. Architecture overview

```
Block registry ──build/runtime──▶ Schema bundle ──┐
                                                   ├─▶ System prompt ─▶ Claude ─▶ JSON
User requirement + current page ───────────────────┘                              │
                                                                                   ▼
                                              WidgetInstance[]  ◀── validate + defaults fill
```

Stages:

1. **Schema extraction** — produce `getSchemaBundle(pageType)`.
2. **Prompt assembly** — build a system prompt from the bundle.
3. **Schema-enforced generation** — single Claude call with structured outputs.
4. **Validation gate** — Ajv validation + defaults fill + one repair re-prompt.
5. **Editor integration** — apply result as an accept/reject preview.

## 6. Detailed design

### 6.1 Schema extraction (the foundation)

**Decision (recommended): Hybrid.**

- **Auto-generate** a structural JSON Schema from each block's exported
  `Settings` interface at page-blocks **build time** (e.g.
  `ts-json-schema-generator`), so every block — including future ones — always
  has a schema with zero authoring.
- **Optionally** let a block export `aiHints` (descriptions, examples, excluded
  internal fields) to improve generation quality where it matters.

> Open decision to finalize: confirm Hybrid vs. pure auto-gen vs. pure
> hand-written. Hybrid is recommended because it preserves the "new block just
> works" property while allowing hand-tuning on high-value blocks.

Proposed registry API (exported from page-blocks):

```ts
interface BlockSchemaEntry {
    name: string; // metadata.name == WidgetInstance.name
    displayName: string;
    description?: string; // from aiHints; steers the model
    schema: JSONSchema; // the settings schema (auto-gen, optionally refined)
    example?: object; // a filled settings sample — biggest quality lever
    compatibleWith: PageType[];
}

function getSchemaBundle(pageType: PageType): BlockSchemaEntry[];
```

Notes:

- Filter by `compatibleWith` so the model only sees valid blocks → smaller
  prompt, fewer invalid suggestions.
- **Exclude internal/editor-only fields** from the schema handed to the AI
  (e.g. `itemBeingEditedIndex`, `editingViewShowSuccess`,
  `editingViewShowSuccess`). These are UI state, not content.
- Schema field **descriptions are prompt engineering** — they are sent to the
  model and directly influence output. Invest in them for complex fields,
  especially nested `TextEditorContent` JSON.

### 6.2 Prompt assembly (server-side)

System prompt contains:

- Role + task framing.
- **Output contract:** return only a JSON array of `WidgetInstance`
  (`widgetId`, `name`, `deleteable`, `shared`, `settings`); nothing else.
- **Block catalog:** for each entry — `name`, `displayName`, `description`,
  its settings JSON Schema, and one filled `example`.
- **Rules:** only use listed `name`s; `settings` must match that block's schema;
  generate a unique `widgetId` per instance; respect page type.

User message: the natural-language requirement, plus the current page JSON when
editing.

> "Fine-tuned prompt" here means a carefully engineered system prompt + schemas,
> NOT a fine-tuned model. This avoids retraining whenever blocks change.

### 6.3 Schema-enforced generation

- Use Claude with **structured outputs** so the response is guaranteed to match
  a top-level schema: `{ type: "array", items: <WidgetInstance schema> }`.
- The per-instance `settings` is constrained per block. Two viable strategies:
    - **A — discriminated union** on `name`: one big schema where `settings`
      varies by `name`. Strongest guarantee; larger schema.
    - **B — two pass:** first ask for the ordered list of block `name`s, then
      constrain `settings` per chosen block. Smaller per-call schema, better for
      large catalogs. (Internal optimization; still one user-facing action.)
    - v1 recommendation: start with **A**; move to **B** if catalog/schema size
      bloats the context or quality drops.

### 6.4 Validation gate (non-negotiable)

LLM output is untrusted until validated:

1. Parse JSON.
2. For each instance: `name` exists in the registry? `settings` validates
   against that block's schema (Ajv)?
3. Fill missing fields from the block's `defaults.ts`.
4. On failure: re-prompt **once** with the validation errors appended; if it
   still fails, return a clear error to the user (do not render).

Output: a validated `WidgetInstance[]`.

### 6.5 Editor integration

- New server endpoint, e.g. `POST /api/ai/page-builder`, payload
  `{ prompt, currentPage, pageType }`. Holds the Anthropic key, builds the
  prompt, calls Claude, validates, returns validated page JSON.
- Admin editor renders the result as a **diff/preview** the user accepts or
  rejects, reusing the existing admin-widget render path.
- Never expose schemas or keys client-side.

## 7. Extensibility contract

Adding a new block requires only the existing block files plus:

- Export its `Settings` type so the build can generate a schema.
- _(Optional)_ add `aiHints` (description, example, excluded fields) to raise
  quality.

No prompt edits, no retraining, no endpoint changes. This is the primary
extensibility requirement and must be preserved by any implementation.

## 8. Industry validation

This is the mainstream pattern (confirmed via research):

- Schema-enforced JSON via **structured outputs / constrained decoding** is
  standard across providers (OpenAI strict mode 2024 → all majors by 2025–26).
- **JSON Schema as the component contract** is used by Webflow AI, Wix,
  Builder.io.
- **Schema descriptions as prompt engineering** is documented best practice.
- A **component registry as the generation target** (cf. shadcn/ui registry) is
  the same shape as `getSchemaBundle()`.
- The rejected alternative — unconstrained HTML generation (Google "Generative
  UI") — is deliberately avoided because it discards the editable block model.

## 9. Risks & mitigations

| Risk                                                   | Mitigation                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| TS-derived schema lacks semantics (URLs, enums intent) | `aiHints` descriptions + examples on important blocks                  |
| Schema drift from real `Settings`                      | Auto-gen from the actual interface; treat hand schema as overlay only  |
| Nested `TextEditorContent` produced incorrectly        | Provide concrete examples; validate; consider a constrained sub-schema |
| Large catalog bloats prompt/context                    | `compatibleWith` filtering; two-pass generation (6.3B)                 |
| Hallucinated block names / fields                      | Structured outputs + Ajv validation gate + repair loop                 |
| Cost/latency of generation                             | Cache schema bundle; single call; stream to UI                         |

## 10. Open questions

1. Finalize schema source: Hybrid (recommended) vs. pure auto-gen vs.
   hand-written.
2. Which JSON-Schema generator and where it runs in the page-blocks build
   (`tsup.config.ts`).
3. Single discriminated-union schema vs. two-pass generation for v1.
4. How `TextEditorContent` (rich text) is represented to the model — full schema
   vs. simplified markdown-to-converted format.
5. Media handling: placeholders vs. leaving empty vs. later asset integration.
6. Preview/accept UX in the admin editor.

## 11. Phasing

- **Phase 1 — Foundation:** `getSchemaBundle()` (auto-gen + optional `aiHints`),
  `Widget` type extension, exclude internal fields.
- **Phase 2 — Generation:** server endpoint, prompt assembly, structured-output
  call, validation gate + defaults fill + repair loop.
- **Phase 3 — UX:** admin editor preview/accept, editing existing pages.
- **Phase 4 — Quality:** per-block examples/descriptions, eval set of prompts,
  iterate. Consider two-pass generation if needed.

## 12. Success metrics

- % of generations that pass validation on first attempt.
- % requiring the repair re-prompt; % failing after repair.
- Time-to-first-valid-page.
- Qualitative: do generated pages match intent without heavy manual editing.
