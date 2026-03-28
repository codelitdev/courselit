// This is only to maintain backward compatibility for codeMirror node type

import { Node } from "@tiptap/core";

export const CodeMirrorNode = Node.create({
    name: "codeMirror",
    content: "block+",
    code: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    parseHTML() {
        return [
            {
                tag: "pre",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["pre", HTMLAttributes, 0];
    },
});
