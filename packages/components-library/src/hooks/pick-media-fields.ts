// MediaLit's upload result is sent to GraphQL as `MediaInput`, which rejects
// fields it doesn't define. MediaLit adds fields to its responses over time
// (`processing` and `derivatives` in v0.8.0), so keep only the ones CourseLit
// stores.
const MEDIA_FIELDS = [
    "mediaId",
    "originalFileName",
    "mimeType",
    "size",
    "access",
    "file",
    "thumbnail",
    "caption",
];

export function pickMediaFields(
    media: Record<string, unknown>,
): Record<string, string> {
    // The hook's callers type the upload result as strings, as before.
    return Object.fromEntries(
        MEDIA_FIELDS.filter((field) => field in media).map((field) => [
            field,
            media[field],
        ]),
    ) as Record<string, string>;
}
