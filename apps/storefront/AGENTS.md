<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Development tips

- ULTRA IMPORTANT: We want to keep the site loading as instantaneous as possible. Don't add things at discretion which might slow down the public site i.e. everything outside of `/dashboard`. We want our public pages to rank high in the lighthouse score so obsess over page loading speed.
- All the UI should be made out of page primitives from `@frontlit/page-builder`, so that the entire portal remains themable and is able to adapt to the school theme
