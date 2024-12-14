import Media from "./media";
import type { Community, Product, Site } from "./page-type";
import WidgetInstance from "./widget-instance";

export default interface Page {
    name: string;
    pageId: string;
    type: Product | Site | Community;
    layout: WidgetInstance[];
    entityId?: string;
    pageData?: Record<string, unknown>;
    deleteable: boolean;
    title?: string;
    description?: string;
    socialImage?: Media;
    robotsAllowed?: boolean;
}
