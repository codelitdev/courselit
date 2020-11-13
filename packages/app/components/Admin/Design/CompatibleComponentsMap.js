import widgets from "../../../config/widgets.js";

const CompatibleComponentsMap = {
  top: [],
  bottom: [],
  aside: [],
  footerLeft: [],
  footerRight: [],
};

Object.keys(widgets).map((widgetName) => {
  const widget = widgets[widgetName];

  widget.metadata.compatibleWith.map((area) => {
    CompatibleComponentsMap[area].push([
      widget.metadata.name,
      widget.metadata.displayName,
    ]);
  });
});

export default CompatibleComponentsMap;
