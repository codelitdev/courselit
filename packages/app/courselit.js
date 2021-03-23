import buttondown from "@courselit/widget-buttondown";
import CommonWidgets from "@courselit/common-widgets";

const getAllWidgets = () => {
  const widgets = {};

  // Add common widgets to CourseLit
  for (const widget of CommonWidgets) {
    widgets[widget.metadata.name] = widget;
  }

  // Additional widgets are added here
  widgets[buttondown.metadata.name] = buttondown;

  return widgets;
};

export const widgets = getAllWidgets();
