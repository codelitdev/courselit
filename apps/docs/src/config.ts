export const SITE = {
    title: "CourseLit Docs",
    description: "Sell courses, digital downloads on your own website",
    defaultLanguage: "en_US",
};

export const OPEN_GRAPH = {
    image: {
        src: "https://courselit.app/_next/image?url=%2Flogo.png&w=96&q=75",
        alt: "CourseLit open source learning management system logo",
    },
    twitter: "courselit",
};

// This is the type of the frontmatter you put in the docs markdown files.
export type Frontmatter = {
    title: string;
    description: string;
    layout: string;
    image?: { src: string; alt: string };
    dir?: "ltr" | "rtl";
    ogLocale?: string;
    lang?: string;
};

export const KNOWN_LANGUAGES = {
    English: "en",
} as const;
export const KNOWN_LANGUAGE_CODES = Object.values(KNOWN_LANGUAGES);

export const GITHUB_EDIT_URL = `https://github.com/codelitdev/courselit/tree/main/apps/docs`;

export const COMMUNITY_INVITE_URL = `https://discord.com/invite/GR4bQsN`;

// See "Algolia" section of the README for more information.
export const ALGOLIA = {
    indexName: "XXXXXXXXXX",
    appId: "XXXXXXXXXX",
    apiKey: "XXXXXXXXXX",
};

export type Sidebar = Record<
    typeof KNOWN_LANGUAGE_CODES[number],
    Record<string, { text: string; link: string }[]>
>;
export const SIDEBAR: Sidebar = {
    en: {
        "Start here": [
            { text: "Getting started", link: "en/introduction" },
            { text: "Self hosting", link: "en/self-hosting" },
            // { text: 'Page 3', link: 'en/page-3' },
        ],
        Courses: [{ text: "Add quiz", link: "en/lessons/add-quiz" }],
    },
};
