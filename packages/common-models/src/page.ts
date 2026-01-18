import { Media } from "./media";
import type { Blog, Community, Product, Site } from "./page-type";
import WidgetInstance from "./widget-instance";

export default interface Page {
    name: string;
    pageId: string;
    type: Product | Site | Community | Blog;
    layout: WidgetInstance[];
    draftLayout?: WidgetInstance[];
    deleteable: boolean;
    deleted: boolean;
    entityId?: string;
    pageData?: Record<string, unknown>;
    title?: string;
    description?: string;
    socialImage?: Media;
    robotsAllowed?: boolean;
    draftTitle?: string;
    draftDescription?: string;
    draftSocialImage?: Media;
    draftRobotsAllowed?: boolean;
    domain?: string;
    creatorId?: string;
}
