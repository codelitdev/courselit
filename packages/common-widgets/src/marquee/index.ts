import AdminWidget from "./admin-widget";
import metadata from "./metadata";
import { Widget as WidgetType } from "@courselit/common-models";
import Widget from "./widget";

export const Marquee: WidgetType = {
    widget: Widget,
    metadata,
    adminWidget: AdminWidget,
};
