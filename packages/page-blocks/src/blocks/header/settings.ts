import { WidgetDefaultSettings } from "@courselit/common-models";

export type Layout = "fixed" | "floating";

export interface Link {
    label: string;
    href: string;
    isButton?: boolean;
    isPrimary?: boolean;
    id: string;
}

export default interface Settings extends WidgetDefaultSettings {
    links: Link[];
    linkAlignment: "left" | "right" | "center";
    showLoginControl: boolean;
    linkFontWeight: "font-normal" | "font-light" | "font-bold";
    spacingBetweenLinks: number;
    githubRepo?: string;
    showGithubStars?: boolean;
    layout?: Layout;
    backdropBlur?: boolean;
}
