import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    products?: string[];
    title?: string;
    description?: any;
    backgroundColor?: string;
    color?: string;
    headerAlignment: Alignment;
    horizontalPadding: number;
    verticalPadding: number;
    cssId?: string;
}
