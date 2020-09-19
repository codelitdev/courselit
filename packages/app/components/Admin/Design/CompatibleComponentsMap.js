import widgets from '../../../config/widgets.js'

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
  footerRight: []
};

// for (let widgetName of Object.keys(widgets)) {
//   for (let area of widgets[widgetName].info.compatible) {
//     CompatibleComponentsMap[area].push([widget.info.id, widget.info.name]);
//   }
// }

Object.keys(widgets).map(widgetName => {
  const widget = widgets[widgetName];

  widget.info.compatible.map(area => {
    CompatibleComponentsMap[area].push([widget.info.id, widget.info.name]);
  })
})

export default CompatibleComponentsMap;