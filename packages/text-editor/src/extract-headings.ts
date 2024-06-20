import { Node, Schema } from "prosemirror-model";
import { RemirrorManager } from "remirror";
import { getExtensions } from "./extensions";
import { createId } from "./create-id";

export function extractHeadings(json: Record<string, unknown>) {
    const headings = [];
    const manager = RemirrorManager.create(getExtensions("", "")());

    const doc = Node.fromJSON(manager.schema as Schema, json);
    doc.descendants((node) => {
        if (node.type.name === "heading") {
            headings.push({
                level: node.attrs.level,
                text: node.textContent,
                id: createId(node.textContent),
            });
        }
    });

    return headings;
}
