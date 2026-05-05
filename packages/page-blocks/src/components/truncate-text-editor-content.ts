import { TextEditorContent } from "@courselit/common-models";
export { normalizeTextEditorContent } from "@courselit/utils";

function appendEllipsisToLastTextNode(nodes: any[]): any[] {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];

        if (!node) {
            continue;
        }

        if (node.type === "text" && typeof node.text === "string") {
            if (!node.text.endsWith("...")) {
                nodes[i] = {
                    ...node,
                    text: `${node.text.trimEnd()}...`,
                };
            }
            return nodes;
        }

        if (Array.isArray(node.content) && node.content.length) {
            nodes[i] = {
                ...node,
                content: appendEllipsisToLastTextNode([...node.content]),
            };
            return nodes;
        }
    }

    return nodes;
}

function truncateNodes(
    nodes: any[],
    remaining: number,
): {
    nodes: any[];
    remaining: number;
    truncated: boolean;
} {
    const truncatedNodes: any[] = [];
    let truncated = false;

    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];

        if (!node) {
            continue;
        }

        if (remaining <= 0) {
            truncated = true;
            break;
        }

        if (node.type === "text" && typeof node.text === "string") {
            if (node.text.length <= remaining) {
                truncatedNodes.push(node);
                remaining -= node.text.length;
            } else {
                truncatedNodes.push({
                    ...node,
                    text: node.text.slice(0, remaining).trimEnd(),
                });
                remaining = 0;
                truncated = true;
                break;
            }

            continue;
        }

        if (node.type === "hardBreak") {
            truncatedNodes.push(node);
            remaining -= 1;
            continue;
        }

        if (Array.isArray(node.content)) {
            const result = truncateNodes(node.content, remaining);
            remaining = result.remaining;

            if (result.nodes.length > 0) {
                truncatedNodes.push({
                    ...node,
                    content: result.nodes,
                });
            }

            if (result.truncated) {
                truncated = true;
                break;
            }

            continue;
        }

        truncatedNodes.push(node);
    }

    if (truncated) {
        return {
            nodes: appendEllipsisToLastTextNode(truncatedNodes),
            remaining,
            truncated,
        };
    }

    return {
        nodes: truncatedNodes,
        remaining,
        truncated,
    };
}

export function truncateTextEditorContent(
    json: TextEditorContent,
    characterLimit?: number,
): TextEditorContent {
    if (!characterLimit || characterLimit <= 0) {
        return json;
    }

    const content = Array.isArray((json as any)?.content)
        ? (json as any).content
        : [];
    const result = truncateNodes(content, characterLimit);

    return {
        ...(json as any),
        content: result.nodes,
    };
}
