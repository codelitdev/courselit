import { extractMediaIDs } from "./extract-media-ids";

// Collects media ids only from the `src` attribute of ProseMirror nodes, such
// as images. Unlike `extractMediaIDs`, it ignores link hrefs, so a document
// that links to someone else's file does not claim that file as its own.
export function extractMediaIDsFromNodeSources(doc: unknown): Set<string> {
    const mediaIds = new Set<string>();

    const traverse = (node: unknown) => {
        if (!node || typeof node !== "object") {
            return;
        }

        const record = node as Record<string, any>;
        const src = record.attrs?.src;
        if (typeof src === "string") {
            for (const mediaId of Array.from(extractMediaIDs(src))) {
                mediaIds.add(mediaId);
            }
        }

        if (Array.isArray(record.content)) {
            record.content.forEach(traverse);
        }
    };

    if (typeof doc === "string") {
        try {
            traverse(JSON.parse(doc));
        } catch {
            return mediaIds;
        }
    } else {
        traverse(doc);
    }

    return mediaIds;
}
