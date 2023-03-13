import { WidgetDefaultSettings } from "@courselit/common-models";

export interface Link {
    label: string;
    href: string;
}

export default interface Settings extends WidgetDefaultSettings {
    links: Link[];
    appBarBackground: string;
    logoColor: string;
    loginBtnColor: string;
    loginBtnBgColor: string;
    linkColor: string;
    linkAlignment: "left" | "right";
}
