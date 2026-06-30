export default function extractTextFromTextEditorContent(
    content: unknown,
): string {
    if (typeof content === "string") {
        return content;
    }

    if (!content || typeof content !== "object") {
        return "";
    }

    const record = content as Record<string, unknown>;
    const ownText = typeof record.text === "string" ? record.text : "";
    const children = Array.isArray(record.content)
        ? record.content.map(extractTextFromTextEditorContent).join("")
        : "";

    return `${ownText}${children}`;
}
