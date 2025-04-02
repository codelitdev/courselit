import AdminWidget from "./admin-widget";
import metadata from "./metadata";
import Widget from "./widget";
import { Widget as WidgetType } from "@courselit/common-models";

export const Content: WidgetType = {
    widget: Widget,
    metadata,
    adminWidget: AdminWidget,
};
