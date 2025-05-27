import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description: Record<string, unknown>;
    headerAlignment: Alignment;
    cssId?: string;
}
