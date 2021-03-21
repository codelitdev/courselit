# Widgets

We can build custom widgets for CourseLit which can be displayed in the `top`, `bottom`, `aside` or `footer` sections of the application.

## Sections

The valid section values are `top`, `bottom`, `aside`, `footerLeft` and `footerRight`.

## Installing A Widget

To install a widget follow these steps.

1. Install the package

```
yarn lerna add my-widget scope=@courselit/app
```

2. Now open `courselit.js` file from `packages/app` and add the widget to the `widgets` section as shown below.

```js
import mywidget from "my-widget";

export default {
  widgets: {
    // other widgets
    [mywidget.metadata.name]: mywidget,
  },
};
```

A CourseLit compatible widget exports an object called `metadata` which contains meta information about the widget. The `metadata` object has a property called `name`. Read more about the structure of a widget below.

## Structure

A widget needs to export the following objects in order for it to be detected by CourseLit. The names of the objects should be the same for every widget.

1. **metadata**: This is a plain JSON object which specifies the configuration of the widget.
2. **widget**: The actual React component which will be visible on the public facing site.
3. **adminWidget**: This is an optional React component which will be visible in the admin area. This component is used to provide access to the settings and data of the widget to administrators of the app.

The `widget` and `adminWidget` components receive the following props from the system.

1. **name**: The name of the widget. This can be used while interacting with the database via GraphQL endpoints (described in the following sections).
2. **fetchBuilder**: A modified `fetch` object which includes the information like the backend URL. The widget can use this custom `fetch` object to make requests to the GraphQL endpoint.
3. **config**: An object containing various configuration settings. Check [this](../packages/app/config/constants.js) file to see what all configurations are available.
4. **utilities**: An object containing utility functions from the core app. Check [this](../packages/app/lib/utils.js) file to see what all functions are available.
5. **section**: A name of the section where the widget is being displayed. As a widget can be displayed in multiple sections (if it supports), you can use this value to adapt the styling of the widget.

## Metadata

The metadata object specifies how the widget is integrated into the system. The following settings are available.

1. **name**: String. _(Required)_. Any one word string which is used to identify the widget in the system. You have to make sure that this does not conflict with any other widget in the system otherwise the database will be messed up.
2. **displayName**: String. _(Required)_. Any string. This is the name of widget an admin user will see while interacting with it from the dashboard.
3. **compatibleWith**: Array of strings. _(Required)_. An array of strings which specifies the section(s) of the application the widget is compatible with. The available sections are `top`, `bottom`, `aside`, `footerLeft` and `footerRight`.
4. **icon**: String. _(Optional)_. A URL string which points to an image. This will be used as the icon of the widget in the dashboard. If this setting is not provided, the default logo will be used.
5. **excludeFromPaths**: Array of strings. _(Optional)_. By default, once integrated the widget will be visible on every page. If there is a case where we do not want to display the widget on certain pages, the page URLs should be listed here. One can include `Next.js` based dynamic URLs like `/posts/[id]/[slug]` as CourseLit's front-end is based on [Next.js](https://nextjs.org/).

### Example

```json
export default {
  name: "buttondown",
  displayName: "Buttondown",
  compatibleWith: ["bottom", "aside"],
  icon: "https://buttondown.email/static/images/icons/icon@72.png",
  excludeFromPaths: ["/post/[id]/[slug]", "/login"],
};
```

## Saving Data

A widget can save any arbitrary data in the system database. Remember to serialize the input in-order to save it. This data will be saved in a separate table designed to hold widgets' data.

There are two aspects to a widget's data. The first one is the widget settings which contain things like URLs, API keys etc. The other aspect is the actual data collected from the end-users.

Both of these aspects have separate columns in the database to hold respective data. In order to manipulate data the widget can leverage the following GraphQL endpoints.

### Saving Settings

```js
saveWidgetSettings(widgetSettingsData: {
    name: "${name}",
    settings: "${JSON.stringify(settingsObject).replace(/"/g, '\\"')}"
}) {
    settings
}
```

### Saving Data

```js
saveWidgetData(widgetData: {
    name: "${name}",
    data: "${JSON.stringify(dataObject).replace(/"/g, '\\"')}"
}) {}
```

## Accessing The Redux Store

Widgets can access app's Redux store. Use something like `react-redux` to interact with the store. Nothing fancy here.

There might be one bit which a widget might be most interested in i.e. the auth JWT (JSON Web Token) which is required to save the widget's data into the system database. To access the token, you can use something like the following.

```js
import { connect } from "react-redux";

// other code

const mapStateToProps = (state) => ({
  auth: state.auth,
});

connect(mapStateToProps)(MyComponent);
```

Then the auth JWT will become available to your React component at `props.auth.token`.

## Making Requests To The GraphQL End-points

As specified under the `Structure` section, the widget's React components receive a prop called `fetchBuilder` which is just a custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) object.

Following is how you make requests to the GraphQL end-points.

```js
const query = `graphql query text`;
const fetch = props.fetchBuilder.setPayload(query).build();

try {
  const response = await fetch.exec();
  // consume response here
} catch (err) {
  // error handling
}
```

While saving user data and fetching settings requires no authentication, saving settings and fetching the saved user data requires admin level privileges hence we need to provide auth JWT in our GraphQL requests to make such requests work. See the preceeding section for how to access the auth JWT.

To include the auth JWT in your GraphQL request, use `.setAuthToken()` on the `fetchBuilder` object. For example.

```js
const fetch = props.fetchBuilder
  .setPayload(query)
  .setAuthToken(props.auth.token)
  .build();
```

## Theming

CourseLit uses [Material-UI's Theming](https://material-ui.com/customization/theming/) system hence you can introduce additional [custom variables](https://material-ui.com/customization/theming/#custom-variables) to the app's theme which you can later consume in your widget.

> Make sure there is a default styling as other themes may or may not provide the custom variables required by your Widget.

To learn how to design themes for CourseLit, see this [link](https://codelit.gitbook.io/courselit/administration-1/layout-and-themes#themes).

## Something's Not Clear?

Come chat with us in our [official Discord channel](https://discord.com/invite/GR4bQsN).
