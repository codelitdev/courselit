import widgets from "../../../../ui-config/widgets";
import CompatibleComponentsMap from "../../../../ui-models/compatible-components-map";
import Widget from "../../../../ui-models/widget";

const ComponentsMap: CompatibleComponentsMap = {
    top: [],
    bottom: [],
    aside: [],
    footerLeft: [],
    footerRight: [],
};

type CompatibleComponentsMapKeys = keyof CompatibleComponentsMap;

Object.keys(widgets).map((widgetName: string) => {
    const widget: Widget = widgets[widgetName];

    widget.metadata.compatibleWith.map((area: CompatibleComponentsMapKeys) => {
        ComponentsMap[area].push([
            widget.metadata.name,
            widget.metadata.displayName,
        ]);
    });
});

export default ComponentsMap;
