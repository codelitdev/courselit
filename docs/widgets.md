# Widgets

We can build custom widgets for CourseLit which can be displayed in the `top`, `bottom`, `aside` or `footer` sections of the application.

## Sections

The valid section values are `top`, `bottom`, `aside`, `footerLeft` and `footerRight`.

## Installing A Widget

To install a widget follow these steps.

1. Install the package

```
yarn workspace @courselit/web add my-widget
```

2. Now open `ui-config/widget.tsx` file located in `apps/web` and add the widget to the `widgets` section as shown below.

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
2. **widget**: The actual `React` component which will be visible on the public facing site.
3. **adminWidget**: This is an optional `React` component which will be visible in the admin area. This component is used to provide access to the settings and data of the widget to administrators of the app.

The `widget` and `adminWidget` components receive the following props from the system.

1. **name**: The name of the widget. This can be used while interacting with the database via GraphQL endpoints (described in the following sections).
2. **settings**: The widget's settings object.
3. **config**: An object containing various configuration settings. Check [this](../apps/web/components/public/base-layout/template/widget-by-name.tsx) file to see what all configurations are available.
4. **section**: A name of the section where the widget is being displayed. As a widget can be displayed in multiple sections (if it supports), you can use this value to adapt the styling of the widget.
5. **state**: The app's state powered by Redux. Equivalent to Redux's `store.getState()`.
6. **dispatch**: The Redux dispatcher.
7. **id**: An identifier to identify widget's data in the app state's `widgetsData` property.

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

## Saving settings

A widget can save its settings inside the `Domain` model under the `layout` property. In your `adminWiget` component you can access a prop called `onChange`. You can call this method with the complete settings object for your widget.

The settings object can be any arbitrary JavaScript object.

```js
const AdminWidget = (props) => {
    const { onChange } = props;
    const settings = {
        propA: "value",
        propB: 1,
    };

    return (
        <div>
            <button onClick={() => onChange(settings)}>Save settings</button>
        </div>
    );
};
```

This will reflect your changes in the `Edit Widget` component.

## Server Side Rendering (SSR)

It is recommended to fetch the data required for showing the widget, on the server side. You can request data from CourseLit's GraphQL API by attaching a method called `getData` to your `widget` component.

While loading the app, all such methods from all the used widgets across the app will be combined and executed as a single query to reduce the round trips to the server.

The data fetched from the server will be stored in the `widgetsData` property of the app state. Every query will get a unique id in the combined query so that while displaying your widget you can pull out the right data from `widgetsData`.

The `getData` method has the following signature.

```js
YourComponent.getData(widgetId: string, widgetSettings: Record<string, unknown>) => string;
```

You will get a unique `widgetId` from the framework. You have to use this as a key to your query. In your React components (widget and adminWidget) you will get this id in a prop called `id`.

### Example

```js
// Fetches courses with a certain tag
Widget.getData = (id: string, settings: Record<string, unknown>) => `
    ${id}: getCourses(offset: 1, tag: "${settings && settings.tag}") {
        id,
        title,
        cost,
        featuredImage {
            thumbnail
        },
        slug,
        courseId,
        isBlog,
        description
    }
`;
```

## Theming

CourseLit uses [Material-UI's Theming](https://material-ui.com/customization/theming/) system hence you can introduce additional [custom variables](https://material-ui.com/customization/theming/#custom-variables) to the app's theme which you can later consume in your widget.

> Make sure there is a default styling as other themes may or may not provide the custom variables required by your Widget.

To learn how to design themes for CourseLit, see this [link](https://codelit.gitbook.io/courselit/administration-1/layout-and-themes#themes).

## Shared Widgets

Shared widgets are those whose settings are stored on the domain level, instead of page level. Hence, a user is not required to configure a shared widget individually for every single page it is used on.

Any page can use a shared widget but the widget's settings are going to be saved and retrieved from the domain.

⚠️ A shared widget's settings are immediately published and are reflected on all pages. There is no draft mode for shared widgets.

## Something's Not Clear?

Come chat with us in our [official Discord channel](https://discord.com/invite/GR4bQsN).
