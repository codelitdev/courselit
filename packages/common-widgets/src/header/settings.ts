export interface Link {
    label: string;
    href: string;
}

export default interface Settings {
    links: Link[];
    appBarBackground: `#${string}`;
    logoColor: `#${string}`;
    loginBtnColor: `#${string}`;
    loginBtnBgColor: `#${string}`;
    linkColor: `#${string}`;
    linkAlignment: "left" | "right";
}
