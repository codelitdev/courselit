import {
    BulletListExtension,
    DocExtension,
    HeadingExtension,
    ImageExtension,
    LinkExtension,
    OrderedListExtension,
    ParagraphExtension,
    PlaceholderExtension,
    TaskListExtension,
    TextExtension,
    wysiwygPreset,
} from "remirror/extensions";
import { CodeMirrorExtension } from "@remirror/extension-codemirror6";
import { TableExtension } from "@remirror/extension-react-tables";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";

const wysiwygPresetArrayWithoutImageExtension = wysiwygPreset().filter(
    (extension) => extension instanceof ImageExtension !== true,
);

export const getExtensions = (placeholder) => () => [
    new DocExtension({}),
    new TextExtension(),
    new ParagraphExtension(),
    new HeadingExtension({}),
    new BulletListExtension({}),
    new LinkExtension({}),
    new OrderedListExtension(),
    new PlaceholderExtension({ placeholder }),
    new TableExtension(),
    new TaskListExtension(),
    new ImageExtension({ enableResizing: true }),
    new CodeMirrorExtension({
        languages: languages,
        extensions: [basicSetup, oneDark],
    }),
    ...wysiwygPresetArrayWithoutImageExtension,
];
