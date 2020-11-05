import buttondown from "@courselit/widget-buttondown";
import CommonWidgets from "@courselit/common-widgets";

const config = {
  widgets: {},
};

// Add common widgets to CourseLit
for (const widget of CommonWidgets) {
  config.widgets[widget.metadata.name] = widget;
}

// Additional widgets are added here
config.widgets[buttondown.metadata.name] = buttondown;

export default config;
