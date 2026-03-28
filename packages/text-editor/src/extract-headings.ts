import type { JSONContent } from "@tiptap/core";
import { createId } from "./create-id";

interface Heading {
    level: number;
    text: string;
    id: string;
}

export function extractHeadings(
    json: JSONContent | null | undefined,
): Heading[] {
    const headings: Heading[] = [];

    const collectHeadings = (node?: JSONContent) => {
        if (!node) {
            return;
        }

        if (node.type === "heading") {
            const level =
                typeof node.attrs?.level === "number" ? node.attrs.level : 1;

            const collectText = (current?: JSONContent): string => {
                if (!current) {
                    return "";
                }

                if (typeof current.text === "string") {
                    return current.text;
                }

                if (!current.content) {
                    return "";
                }

                return current.content.map(collectText).join("");
            };

            const textContent = collectText(node);

            headings.push({
                level,
                text: textContent,
                id: createId(textContent),
            });
        }

        if (Array.isArray(node.content)) {
            node.content.forEach((child) => {
                collectHeadings(child as JSONContent);
            });
        }
    };

    collectHeadings(json || undefined);

    return headings;
}
