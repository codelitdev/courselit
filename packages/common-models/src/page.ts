import type { Product, Site } from "./page-type";
import WidgetInstance from "./widget-instance";

export default interface Page {
    name: string;
    pageId: string;
    type: Product | Site;
    layout: WidgetInstance[];
    entityId?: string;
}
