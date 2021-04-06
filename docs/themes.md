# Themes

You can target the following components in addition to the components from the [Material-UI's theme](https://material-ui.com/customization/theming/).

```js
{
    body: {},
    appBar: {},
    logo: {},
    siteName: {},
    drawer: {},
    footerContainer: {},
    footer: {},
    section: {},
}
```

## Using Google Fonts

It can be done in two easy steps.

1. In the customization section, add a `rel` link to import the font.

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css?family=Font+Name"
/>
```

2. In your theme add the following property.

```js
{
  // ... other styles
  typography: {
    fontFamily: "Font Name, Other Font Name Separated By Commas";
  }
}
```
