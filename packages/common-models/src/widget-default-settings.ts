import {
    PageTypeBlog,
    PageTypeCommunity,
    PageTypeProduct,
    PageTypeSite,
} from ".";
import type { ThemeStyle } from "@courselit/page-models";

type PageType =
    | PageTypeProduct
    | PageTypeSite
    | PageTypeBlog
    | PageTypeCommunity;

export default interface WidgetDefaultSettings {
    type: PageType;
    verticalPadding: ThemeStyle["structure"]["section"]["verticalPadding"];
    maxWidth?: ThemeStyle["structure"]["page"]["width"];
}
