export default function extractTextFromTextEditorContent(
    content: unknown,
): string {
    if (typeof content === "string") {
        return content.replace(/\r\n?/g, "\n");
    }

    if (!content || typeof content !== "object") {
        return "";
    }

    const record = content as Record<string, unknown>;
    if (record.type === "hardBreak") {
        return "\n";
    }

    const ownText = typeof record.text === "string" ? record.text : "";
    const children = Array.isArray(record.content)
        ? record.content.map(extractTextFromTextEditorContent)
        : [];

    return `${ownText}${children.join(getNodeSeparator(record.type))}`;
}

function getNodeSeparator(nodeType: unknown): string {
    switch (nodeType) {
        case "doc":
            return "\n\n";
        case "bulletList":
        case "orderedList":
            return "\n";
        default:
            return "";
    }
}
