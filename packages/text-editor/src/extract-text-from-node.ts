export function extractTextFromNode(node): string {
    if (!node) {
        return "";
    }

    // ProseMirror nodes have a textContent property that contains all text
    if (typeof node.textContent === "string") {
        return node.textContent;
    }

    // Fallback: if content is a Fragment, access its content array
    if (
        node.content &&
        node.content.content &&
        Array.isArray(node.content.content)
    ) {
        return node.content.content
            .map((child: any) => {
                // Text nodes have a text property
                if (child.text) {
                    return child.text;
                }
                // Recursively extract from child nodes
                return extractTextFromNode(child);
            })
            .join("");
    }

    // Fallback: if content is directly an array
    if (Array.isArray(node.content)) {
        return node.content
            .map((child: any) => {
                if (child.text) {
                    return child.text;
                }
                return extractTextFromNode(child);
            })
            .join("");
    }

    return "";
}
