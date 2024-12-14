import {
    PageTypeBlog,
    PageTypeProduct,
    PageTypeSite,
    PageTypeCommunity,
} from ".";

type PageType =
    | PageTypeProduct
    | PageTypeSite
    | PageTypeBlog
    | PageTypeCommunity;

export default interface WidgetMetadata {
    name: string;
    displayName: string;
    compatibleWith: PageType[];
    icon?: string;
}
