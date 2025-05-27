import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    products?: string[];
    title?: string;
    description?: any;
    headerAlignment: Alignment;
    cssId?: string;
}
