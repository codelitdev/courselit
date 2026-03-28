# CourseLit's Text Editor

This is a rich text editor built on top of [TipTap v3](https://tiptap.dev/).

## Installation

To install this package, use the following command.

```sh
npm install @courselit/text-editor
```

After installing, import the bundled styles once in your app (for example, in your root layout).

```ts
import "@courselit/text-editor/styles.css";
```

> TipTap relies on ProseMirror. The editor ships with all required extensions, so no additional peer dependencies are needed.

## Shortcut keys

`Ctrl + b`: Bold

`Ctrl + i`: Italic

`Ctrl + u`: Underline

`Ctrl + Shift + s`: Strikethrough

`Ctrl + z`: Undo

`Ctrl + Z`: Redo

`Ctrl + v`: Paste

`Ctrl + Shift + 7`: Ordered list

`Ctrl + Shift + 8`: Bulleted list

`Ctrl + Shift + H`: Highlight (or type `==two equal signs==` and it will be converted to highlight)

## Images

Use the _Image_ button in the toolbar to upload assets to CourseLit. Uploads are limited to `2 Mega bytes` per file.
