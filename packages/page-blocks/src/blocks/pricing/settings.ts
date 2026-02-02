import {
    Alignment,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";

interface ItemAction {
    label: string;
    href: string;
    yearlyHref?: string;
}

export interface Item {
    title: string;
    price: string;
    priceYearly?: string;
    description: TextEditorContent;
    features: string;
    action: ItemAction;
    primary?: boolean;
}

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description?: TextEditorContent;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    items?: Item[];
    cssId?: string;
    columns?: number;
    pricingSwitcher?: boolean;
    monthlyPriceCaption?: string;
    yearlyPriceCaption?: string;
}
