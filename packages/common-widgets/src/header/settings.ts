import { WidgetDefaultSettings } from "@courselit/common-models";

export interface Link {
    label: string;
    href: string;
    isButton?: boolean;
    isPrimary?: boolean;
    id: string;
}

export default interface Settings extends WidgetDefaultSettings {
    links: Link[];
    appBarBackground: string;
    logoColor: string;
    loginBtnColor: string;
    loginBtnBgColor: string;
    linkColor: string;
    linkAlignment: "left" | "right" | "center";
    showLoginControl: boolean;
    linkFontWeight: "font-normal" | "font-light" | "font-bold";
    spacingBetweenLinks: number;
    horizontalPadding: number;
    verticalPadding: number;
}
