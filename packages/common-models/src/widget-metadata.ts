import CompatibleComponentsMap from "./compatible-components-map";

export default interface WidgetMetadata {
    name: string;
    displayName: string;
    compatibleWith: (keyof CompatibleComponentsMap)[];
    icon: string;
    excludeFromPaths: string[];
}
