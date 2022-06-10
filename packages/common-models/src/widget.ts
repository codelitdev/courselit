import WidgetMetadata from "./widget-metadata";

export default interface Widget {
    widget: unknown;
    adminWidget?: unknown;
    metadata: WidgetMetadata;
}
