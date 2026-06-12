# Notification Email Template Overhaul

## Summary

Replace the hand-written notification email HTML in `@courselit/queue` with a standardized `@courselit/email-editor` template. The email will show the actor beside an avatar, make “View notification” the clear primary button, move unsubscribe into small grey footer text, and conditionally include a CourseLit branding badge.

## Key Changes

- Render notification emails with `renderEmailToHtml` from `@courselit/email-editor` instead of raw inline HTML.
- Template structure:
    - Actor row with avatar and `actorName`.
    - Notification message.
    - Centered `View notification` button.
    - Footer separator/spacer.
    - Small centered grey unsubscribe footer.
    - Conditional `Powered by CourseLit` badge below the footer.
- Avatar behavior:
    - Use `payload.actor.avatar.file`, then `payload.actor.avatar.thumbnail`.
    - If no avatar URL exists, render initials from `actorName`.
- Branding behavior:
    - Match existing system-email templates.
    - Show the badge when `!payload.domain.settings?.hideCourseLitBranding`.
    - Hide the badge when `payload.domain.settings?.hideCourseLitBranding` is true.
    - Badge links to `https://courselit.app` and reads `Powered by CourseLit`.
- Preserve current delivery behavior and headers, including `List-Unsubscribe`.

## Interfaces

- No GraphQL or REST API changes.
- Add an internal notification email template helper accepting:
    - `actorName`
    - `actorAvatarUrl`
    - `message`
    - `notificationUrl`
    - `unsubscribeUrl`
    - `hideCourseLitBranding`
- Use standard email-editor `image` and `text` blocks for actor avatar/name rendering.
    - When no actor avatar URL exists, generate a small initials SVG data URI for the image block.

## Tests

- Verify the rendered email includes:
    - Actor name and avatar URL when available.
    - Initials fallback when avatar is missing.
    - `View notification` before unsubscribe.
    - Unsubscribe only in the footer area.
    - `Powered by CourseLit` when branding is not hidden.
    - No `Powered by CourseLit` when `hideCourseLitBranding` is true.
    - Existing `List-Unsubscribe` headers unchanged.
- Run:
    - `pnpm --filter @courselit/queue check-types`
    - `pnpm test`
    - Before commit: `pnpm lint` and `pnpm prettier`

## Assumptions

- The CourseLit badge should use the same visibility rule as `download-link.ts`, `course-enroll.ts`, and `magic-code-email.ts`.
- The CTA remains a button.
- This applies only to notification emails.
