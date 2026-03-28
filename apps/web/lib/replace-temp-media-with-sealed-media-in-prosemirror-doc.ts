import { sealMedia } from "@/services/medialit";
import { extractMediaIDs } from "@courselit/utils";
import { TextEditorContent } from "@courselit/common-models";

export async function replaceTempMediaWithSealedMediaInProseMirrorDoc(
    doc: string,
): Promise<TextEditorContent> {
    if (!doc) return { type: "doc", content: [] };

    const mediaIds = Array.from(extractMediaIDs(doc));
    for (const mediaId of mediaIds) {
        const media = await sealMedia(mediaId);
        if (media) {
            doc = replaceMediaURLinProseMirrorDoc(doc, mediaId, media.file!);
        }
    }

    return JSON.parse(doc);
}

function replaceMediaURLinProseMirrorDoc(
    doc: string,
    mediaId: string,
    newURL: string,
): string {
    try {
        const json = JSON.parse(doc);

        const traverse = (node: any) => {
            if (node.attrs?.src) {
                try {
                    const { pathname } = new URL(node.attrs.src);
                    const segments = pathname.split("/").filter(Boolean);

                    if (segments.length >= 2) {
                        const lastSegment = segments[segments.length - 1];
                        if (/^main\.[^/]+$/i.test(lastSegment)) {
                            const id = segments[segments.length - 2];
                            if (id === mediaId) {
                                node.attrs.src = newURL;
                            }
                        }
                    }
                } catch {
                    // Ignore invalid URLs
                }
            }

            if (Array.isArray(node.content)) {
                node.content.forEach(traverse);
            }
        };

        traverse(json);
        return JSON.stringify(json);
    } catch {
        return doc;
    }
}
