import { PageTypeBlog, PageTypeProduct, PageTypeSite } from ".";

type PageType = PageTypeProduct | PageTypeSite | PageTypeBlog;

export default interface WidgetMetadata {
    name: string;
    displayName: string;
    compatibleWith: PageType[];
    icon?: string;
}
