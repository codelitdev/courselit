import {
    PageTypeBlog,
    PageTypeCommunity,
    PageTypeProduct,
    PageTypeSite,
} from ".";
import type { SectionBackground, ThemeStyle } from "@courselit/page-models";

type PageType =
    | PageTypeProduct
    | PageTypeSite
    | PageTypeBlog
    | PageTypeCommunity;

export default interface WidgetDefaultSettings {
    type: PageType;
    verticalPadding: ThemeStyle["structure"]["section"]["padding"]["y"];
    maxWidth?: ThemeStyle["structure"]["page"]["width"];
    background?: SectionBackground;
}
