import { PageTypeProduct, PageTypeSite } from ".";

export default interface WidgetMetadata {
    name: string;
    displayName: string;
    compatibleWith: (PageTypeProduct | PageTypeSite)[];
    icon?: string;
}
