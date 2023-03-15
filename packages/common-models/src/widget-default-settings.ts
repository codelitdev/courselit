import { PageTypeBlog, PageTypeProduct, PageTypeSite } from ".";

type PageType = PageTypeProduct | PageTypeSite | PageTypeBlog;

export default interface WidgetDefaultSettings {
    pageId: string;
    type: PageType;
    entityId: string;
}
