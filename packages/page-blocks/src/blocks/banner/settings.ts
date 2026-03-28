import { Alignment, TextEditorContent } from "@courselit/common-models";
import { WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    productId?: string;
    title?: string;
    description?: string;
    buttonCaption?: string;
    buttonAction?: string;
    alignment?: "top" | "bottom" | "left" | "right";
    textAlignment?: Alignment;
    successMessage?: TextEditorContent;
    failureMessage?: string;
    editingViewShowSuccess: "1" | "0";
    mediaRadius?: number;
    cssId?: string;
}
