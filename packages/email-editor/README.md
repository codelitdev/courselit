# Introduction

A WYSIWYG email editor by CourseLit.

## Installation

The project depends of TailwindCSS, so you need to have it configured on your project, before installating this package.

```sh
npm i @courselit/email-editor
```

### Importing the CSS

#### 1. Tailwind v4

In your CSS file, add

```css
@source "./node_modules/@courselit/email-editor";
```

## Tech Stack

- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [React email](https://react.email/)

## Usage

To show the email editor

```js
import { EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";

export default App() {
    return (<EmailEditor  />)
}
```
