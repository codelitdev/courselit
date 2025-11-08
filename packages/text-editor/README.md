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

`Ctrl + d`: Strikethrough

`Ctrl + k`: Create/edit a link

`Ctrl + z`: Undo

`Ctrl + Z`: Redo

`Ctrl + v`: Paste

`Ctrl + Shift + 8`: Bulleted list

`Ctrl + Shift + 9`: Ordered list

`Ctrl + Shift + 7`: Task list

## Images

Use the _Image_ button in the toolbar to upload assets to CourseLit. Uploads are limited to 2MB per file.
