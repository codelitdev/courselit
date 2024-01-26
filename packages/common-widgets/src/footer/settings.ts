import { WidgetDefaultSettings } from "@courselit/common-models";

export interface Link {
    label: string;
    href: string;
}

export interface Section {
    name: string;
    links: Link[];
}

export default interface Settings extends WidgetDefaultSettings {
    foregroundColor?: string;
    backgroundColor?: string;
    title?: string;
    subtitle?: string;
    sections?: Section[];
    horizontalPadding: number;
    verticalPadding: number;
    titleFontSize?: number;
    sectionHeaderFontSize: "font-normal" | "font-semibold" | "font-medium";
}
