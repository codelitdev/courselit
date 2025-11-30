export function extractMediaIDs(doc: string): Set<string> {
    const mediaIds = new Set<string>();

    const regex = /https?:\/\/[^\s"']+/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(doc)) !== null) {
        const url = match[0];

        try {
            const { pathname } = new URL(url);
            const segments = pathname.split("/").filter(Boolean);

            if (segments.length < 2) {
                continue;
            }

            const lastSegment = segments[segments.length - 1];
            if (!/^main\.[^/]+$/i.test(lastSegment)) {
                continue;
            }

            const mediaId = segments[segments.length - 2];
            if (mediaId) {
                mediaIds.add(mediaId);
            }
        } catch {
            continue;
        }
    }

    return mediaIds;
}
