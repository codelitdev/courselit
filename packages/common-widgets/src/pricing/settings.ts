import { Alignment, WidgetDefaultSettings } from "@courselit/common-models";

interface ItemAction {
    label: string;
    href: string;
}

export interface Item {
    title: string;
    price: string;
    description: Record<string, unknown>;
    features: string;
    action: ItemAction;
    primary?: boolean;
}

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description?: Record<string, unknown>;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    backgroundColor?: string;
    foregroundColor?: string;
    items?: Item[];
    horizontalPadding: number;
    verticalPadding: number;
    buttonBackground?: string;
    buttonForeground?: string;
    primaryButtonBackground?: string;
    cardBorderColor?: string;
    cssId?: string;
    columns?: number;
}
