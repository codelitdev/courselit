import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
    Table,
    TableRow,
    TableCell,
    TableHeader,
} from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Heading from "@tiptap/extension-heading";
import { lowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import type { Extensions } from "@tiptap/core";
import { createId } from "./create-id";

lowlight.registerLanguage("javascript", javascript);
lowlight.registerLanguage("typescript", typescript);
lowlight.registerLanguage("json", json);
lowlight.registerLanguage("css", css);
lowlight.registerLanguage("html", xml);

interface ExtensionOptions {
    placeholder?: string;
}

export const createExtensions = ({
    placeholder,
}: ExtensionOptions = {}): Extensions => [
    StarterKit.configure({
        codeBlock: false,
    }),
    Placeholder.configure({
        placeholder: placeholder || "Write something…",
    }),
    Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
    }),
    Table.configure({
        resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Image.extend({
        addAttributes() {
            const parentAttributes =
                typeof this.parent === "function" ? this.parent() : {};

            return {
                ...parentAttributes,
                mediaId: {
                    default: null,
                    parseHTML: (element) =>
                        element.getAttribute("data-media-id"),
                    renderHTML: (attributes) =>
                        attributes.mediaId
                            ? { "data-media-id": attributes.mediaId }
                            : {},
                },
                originalFileName: {
                    default: null,
                    parseHTML: (element) =>
                        element.getAttribute("data-original-file-name"),
                    renderHTML: (attributes) =>
                        attributes.originalFileName
                            ? {
                                  "data-original-file-name":
                                      attributes.originalFileName,
                              }
                            : {},
                },
            };
        },
    }).configure({
        allowBase64: false,
        HTMLAttributes: {
            class: "max-w-full h-auto rounded-md",
        },
    }),
    Dropcursor.configure({
        color: "hsl(var(--foreground))",
        width: 2,
    }),
    Gapcursor,
    CodeBlockLowlight.configure({
        lowlight,
    }),
    Heading.extend({
        renderHTML({ node, HTMLAttributes }) {
            const level = this.options.levels.includes(node.attrs.level)
                ? node.attrs.level
                : this.options.levels[0];
            const id =
                typeof node.textContent === "string"
                    ? createId(node.textContent)
                    : undefined;

            return [
                `h${level}`,
                {
                    ...HTMLAttributes,
                    id,
                },
                0,
            ];
        },
    }),
];
