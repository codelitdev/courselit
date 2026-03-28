# Create Post Dialog Architecture and Performance Review

## Scope

This review covers:

- `apps/web/components/community/create-post-dialog.tsx`
- Child components used in the dialog:
    - `apps/web/components/community/gif-selector.tsx`
    - `apps/web/components/community/media-preview.tsx`
    - `apps/web/components/community/emoji-picker.tsx`
- Parent integration points in `apps/web/components/community/index.tsx`

## Assessment

The current implementation is functional and reasonably optimized for light usage, but it is not yet robust for heavier create/edit workflows. The primary issues are state mutation across component boundaries and weak async race handling.

## Findings (highest impact first)

### 1) Input object mutation across component boundary

- Parent `createPost` mutates `newPost.media` and each media item in place (`m.file = undefined`, `m.url = undefined`) in:
    - `apps/web/components/community/index.tsx:406`
    - `apps/web/components/community/index.tsx:581`
- Child passes its own `media` state directly in:
    - `apps/web/components/community/create-post-dialog.tsx:249`

Why this matters:

- Breaks immutability expectations between parent/child.
- Can cause subtle UI/state bugs in preview, cleanup, and edit flow.
- Makes behavior harder to reason about and test.

### 2) GIF search race condition and missing fetch cancellation

- Debounce is used, but in-flight requests are not aborted in:
    - `apps/web/components/community/gif-selector.tsx:20`
    - `apps/web/components/community/gif-selector.tsx:45`

Why this matters:

- Stale responses can overwrite newer search results.
- Users on slow networks may see “result jumping” backward.

### 3) Inconsistent upload state contract

- `isFileUploading` is declared and passed, but unused in dialog:
    - Declared: `apps/web/components/community/create-post-dialog.tsx:54`
    - Passed: `apps/web/components/community/index.tsx:1046`, `apps/web/components/community/index.tsx:1330`
- Upload progress display is tied to `isPosting`, not explicit upload state.

Why this matters:

- Ambiguous ownership of loading/progress UI.
- Easier to regress upload UX during refactors.

### 4) Unstable keys in media preview list

- Media preview uses array index as key:
    - `apps/web/components/community/media-preview.tsx:25`

Why this matters:

- Removing/reordering items causes unnecessary remounts.
- Can produce visual glitches and extra repaint work.

### 5) Submit/reset flow fragile to parent behavior changes

- `handlePost` lacks local `try/finally` guard:
    - `apps/web/components/community/create-post-dialog.tsx:230`
- It assumes parent handles errors and always resolves safely.

Why this matters:

- If parent later throws, `isPosting` can become stuck.
- Error boundaries between layers are unclear.

## Performance posture

What is already good:

- Core handlers are wrapped in `useCallback`.
- Derived values use `useMemo` where reasonable.
- `CreatePostDialog` is dynamically imported from parent.
- Blob URL cleanup is implemented.

What remains weak under scale:

- GIF fetch race conditions.
- Non-virtualized image-heavy grids/previews.
- Index keys in preview lists.
- Mutation-driven rerender unpredictability.

## Architecture posture

Current state is a “fat component”: form state, media orchestration, validation, and submit lifecycle all live in one component.

Suggested target shape:

- `usePostComposer` hook for form and validation lifecycle.
- `PostComposerMedia` for attachment/GIF/video orchestration.
- Presentational dialog shell kept mostly stateless.

This split would reduce coupling and make create/edit behavior easier to test.

## Prioritized recommendations

1. Make `createPost` and `uploadAttachments` immutable (clone media payload before transformations).
2. Add GIF request cancellation or request-sequencing safeguards to avoid stale overwrites.
3. Replace index keys in preview items with stable client-generated ids.
4. Normalize upload/posting state contract (`isPosting` vs `isFileUploading`) and enforce local `try/finally` in submit flow.

## Task list (easy -> hard, tick as completed)

### Easy

- [x] Remove or use `isFileUploading` in `CreatePostDialog` to make the prop contract consistent.
- [x] Add local `try/finally` in `handlePost` so `isPosting` always resets.
- [x] Replace media preview index keys with a stable key strategy where available.

### Medium

- [x] Add request ordering or `AbortController` cancellation in `GifSelector` so stale requests cannot overwrite current query results.
- [x] Add/adjust tests around post creation/edit submission states (especially loading and error paths).

### Hard

- [ ] Refactor `createPost`/`uploadAttachments` to be fully immutable and side-effect free with respect to caller-owned objects.
- [ ] Extract post composer logic into composable units (`usePostComposer`, media orchestration component/hook), reducing `create-post-dialog.tsx` scope.
- [ ] Evaluate virtualization/lazy-loading strategy for GIF/media-heavy surfaces if usage patterns show large payloads.
