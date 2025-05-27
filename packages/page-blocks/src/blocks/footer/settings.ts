import { WidgetDefaultSettings } from "@courselit/common-models";

export interface Link {
    label: string;
    href: string;
    id: string;
}

export interface Section {
    name: string;
    links: Link[];
    id: string;
}

export interface Socials {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    discord?: string;
    github?: string;
}

export default interface Settings extends WidgetDefaultSettings {
    title?: string;
    subtitle?: string;
    sections?: Section[];
    titleFontSize?: number;
    subtitleFontSize?: number;
    sectionHeaderFontSize: "font-normal" | "font-semibold" | "font-medium";
    socials?: Socials;
    socialIconsSize?: number;
}
