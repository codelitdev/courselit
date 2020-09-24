import widgets from "../../../config/widgets.js";

// const CompatibleComponentsMap = {
//   top: ["Featured"],
//   bottom: ["About"],
//   aside: ["About"],
//   footerLeft: ["Copyright Text", "Branding", "Footer Menu"],
//   footerRight: ["Copyright Text", "Branding", "Footer Menu"],
// };
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
