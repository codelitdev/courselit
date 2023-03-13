import { Alignment } from "@courselit/common-models";
import {
    PageTypeProduct,
    PageTypeSite,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    entityId: string;
    type: PageTypeProduct | PageTypeSite;
    productId?: string;
    title?: string;
    description?: string;
    buttonCaption?: string;
    buttonAction?: string;
    alignment?: "top" | "bottom" | "left" | "right";
    textAlignment?: Alignment;
    backgroundColor?: string;
    color?: string;
    buttonBackground?: string;
    buttonForeground?: string;
}
