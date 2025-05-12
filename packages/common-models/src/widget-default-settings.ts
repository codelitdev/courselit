import {
    PageTypeBlog,
    PageTypeCommunity,
    PageTypeProduct,
    PageTypeSite,
    Theme,
} from ".";

type PageType =
    | PageTypeProduct
    | PageTypeSite
    | PageTypeBlog
    | PageTypeCommunity;

export default interface WidgetDefaultSettings {
    type: PageType;
    verticalPadding: Theme["structure"]["section"]["verticalPadding"];
    maxWidth?: Theme["structure"]["page"]["width"];
}
