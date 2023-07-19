import { Alignment } from "@courselit/common-models";
import {
    PageTypeProduct,
    PageTypeSite,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
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
    successMessage?: string;
    failureMessage?: string;
    editingViewShowSuccess: 1 | 0;
}
