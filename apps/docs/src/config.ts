export const SITE = {
    title: "CourseLit Documentation",
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
        "Online courses": [
            { text: "Creating a course", link: "en/create-course" },
            { text: "Adding lessons", link: "en/add-lesson" }
        ],
        "Digital downloads": [
            { text: "Creating a digital download", link: "en/create-digital-download" }
        ],
        "Blogs": [
            { text: "Writing", link: "en/writing-blog" }
        ],
        "Website": [
            { text: "Page builder basics", link: "en/page-builder-basics" },
            { text: "Shared blocks", link: "en/page-builder-shared-blocks" }
        ],
        "Payments": [
            { text: "Set up Stripe", link: "en/payment-stripe-setup" }
        ]
        // 'Another Section': [{ text: 'Page 4', link: 'en/page-4' }],
    },
};
