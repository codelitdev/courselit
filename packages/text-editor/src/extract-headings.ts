import { Node, Schema } from "prosemirror-model";
import { RemirrorManager } from "remirror";
import { AnyExtension } from "@remirror/core";
import { getExtensions } from "./extensions";
import { createId } from "./create-id";

interface Heading {
    level: number;
    text: string;
    id: string;
}

interface JSONDoc {
    type: string;
    content?: JSONDoc[];
    attrs?: Record<string, unknown>;
    text?: string;
}

export function extractHeadings(json: JSONDoc): Heading[] {
    const headings: Heading[] = [];
    const exts = getExtensions("", "")() as unknown as AnyExtension[];
    const manager = RemirrorManager.create(exts);

    const doc = Node.fromJSON(manager.schema as Schema, json);
    doc.descendants((node) => {
        if (node.type.name === "heading") {
            headings.push({
                level: node.attrs.level as number,
                text: node.textContent,
                id: createId(node.textContent),
            });
        }
    });

    return headings;
}
