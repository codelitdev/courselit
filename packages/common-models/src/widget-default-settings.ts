import {
    PageTypeBlog,
    PageTypeCommunity,
    PageTypeProduct,
    PageTypeSite,
} from ".";

type PageType =
    | PageTypeProduct
    | PageTypeSite
    | PageTypeBlog
    | PageTypeCommunity;

export default interface WidgetDefaultSettings {
    type: PageType;
}
