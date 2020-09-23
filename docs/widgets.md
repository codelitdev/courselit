# Widgets

We can build custom widgets for CourseLit which can be displayed in `top`, `bottom`, `aside` or `footer` sections of the application.

### Structure
A widget needs to export three objects which are described below. The names of the objects should be the same for every widget.

1. **widget**: This is a React component which will be visible to the end user as the actual widget.
2. **adminWidget**: This is a `React` component which will be visible in the admin area. This component is used to provide access to the settings and data of the widget.
3. **metadata**: This is a plain JSON object which specifies the configuration of the widget.

### Metadata

The metadata object specifies how the widget is integrated into the system. The following settings are available.

1. **name**: String.  _(Required)_. Any one word string which is used to identify the widget in the system. You have to make sure that this does not conflict with any other widget in the system otherwise the database will be messed up.
2. **displayName**: String.  _(Required)_. Any string. This is the name of widget the admin user will be see while interacting with it from the dashboard.
3. **icon**: String.  _(Required)_. A URL string which points to an image. This will be used as the icon of the widget in the dashboard.
4. **compatibleWith**: Array of strings.  _(Required)_. An array of strings which specifies the section(s) of the application the widget is compatible with. The available sections are `top`, `bottom`, `aside` and `footer`.
5. **excludeFromPaths**: Array of strings.  _(Optional)_. By default, once integrated the widget will be visible on every page. If there is a case where we do not want to display the widget on certain pages, the page URLs should be listed here. One can include `Next.js` based dynamic URLs like `/posts/[id]/[slug]` as CourseLit's front-end is based on [Next.js](https://nextjs.org/).