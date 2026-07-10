import { TextEditorContent } from "@courselit/common-models";

function createParagraphNode(text: string) {
    const lines = text.split("\n");
    const content: Record<string, unknown>[] = [];

    lines.forEach((line, index) => {
        if (line) {
            content.push({
                type: "text",
                text: line,
            });
        }

        if (index < lines.length - 1) {
            content.push({
                type: "hardBreak",
            });
        }
    });

    return {
        type: "paragraph",
        ...(content.length ? { content } : {}),
    };
}

export default function normalizeTextEditorContent(
    json: TextEditorContent | string,
): TextEditorContent {
    if (
        json &&
        typeof json === "object" &&
        "type" in json &&
        json.type === "doc"
    ) {
        return json as TextEditorContent;
    }

    const text = typeof json === "string" ? json.replace(/\r\n?/g, "\n") : "";

    return {
        type: "doc",
        content: text
            ? text
                  .split(/\n{2,}/)
                  .map((paragraph) => createParagraphNode(paragraph))
            : [],
    };
}
