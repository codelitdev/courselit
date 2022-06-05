# Themes

You can target the following components in addition to the components from the [Material-UI's theme](https://material-ui.com/customization/theming/).

```js
{
    body: {},
    appBar: {},
    logo: {},
    drawer: {},
    footerContainer: {},
    footer: {},
    section: {},

    // If you want to show the site name alongside the logo, set
    // the 'display' property to 'block'
    siteName: {},

    // Material-UI has a grid of twelve columns hence the addition
    // of the following two columns should be equal to 12.
    mainContentWidth: 8,
    asideWidth: 4,

    // If you want to hide the aside section, set the following to true
    singleColumnLayout: true,

    // If you want to hide the login/logout button, set the following to true
    hideLoginButton: true,

    // Other Material-UI Theme properties can go here
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
