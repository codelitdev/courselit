import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    title?: string;
    subtitle?: string;
    btnText?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    btnBackgroundColor?: string;
    btnForegroundColor?: string;
    alignment?: Alignment | "right";
    successMessage?: string;
    failureMessage?: string;
    cssId?: string;
}
