// import buttondown from "@courselit/widget-buttondown";
import CommonWidgets from "@courselit/common-widgets";

const getAllWidgets = (): Record<string, any> => {
  const widgets: Record<string, any> = {};

  // Add common widgets to CourseLit
  for (const widget of CommonWidgets) {
    widgets[widget.metadata.name] = widget;
  }

  // Additional widgets are added here
//   widgets[buttondown.metadata.name] = buttondown;

  return widgets;
};

export default getAllWidgets();
