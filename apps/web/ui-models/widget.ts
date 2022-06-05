import WidgetMetadata from "./widget-metadata";

export default interface Widget {
    widget: any;
    adminWidget?: any;
    metadata: WidgetMetadata;
}
