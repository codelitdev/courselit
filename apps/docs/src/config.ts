export const SITE = {
    title: "CourseLit Docs",
    description: "Sell courses, digital downloads on your own website",
    defaultLanguage: "en_US",
};

export const OPEN_GRAPH = {
    image: {
        src: "/favicon.svg",
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
    (typeof KNOWN_LANGUAGE_CODES)[number],
    Record<string, { text: string; link: string }[]>
>;
export const SIDEBAR: Sidebar = {
    en: {
        "Getting started": [
            { text: "What is CourseLit", link: "en/introduction" },
            { text: "Our vision", link: "en/vision" },
            { text: "Features", link: "en/features" },
        ],
        "Online courses": [
            { text: "Introduction", link: "en/courses/introduction" },
            { text: "Create a course", link: "en/courses/create" },
            { text: "Publish", link: "en/courses/publish" },
            { text: "Set a price", link: "en/courses/set-a-price-for-product" },
            { text: "Control visibility", link: "en/courses/visibility" },
            { text: "Add content", link: "en/courses/add-content" },
            { text: "Manage sections", link: "en/products/section" },
            { text: "Invite customers", link: "en/products/invite-customers" },
            { text: "Certificates", link: "en/products/certificates" },
        ],
        "Digital downloads": [
            { text: "Introduction", link: "en/downloads/introduction" },
            { text: "Create a download", link: "en/downloads/create" },
            { text: "Set a price", link: "en/downloads/set-a-price" },
            { text: "Lead magnet", link: "en/downloads/lead-magnet" },
        ],
        Communities: [
            { text: "Introduction", link: "en/communities/introduction" },
            { text: "Create a community", link: "en/communities/create" },
            { text: "Manage members", link: "en/communities/manage-members" },
            {
                text: "Manage reported content",
                link: "en/communities/manage-reported-content",
            },
            {
                text: "Unlock additional products",
                link: "en/communities/grant-access-to-additional-products",
            },
            { text: "Delete a community", link: "en/communities/delete" },
        ],
        "Email marketing and automation": [
            { text: "Introduction", link: "en/email-marketing/introduction" },
            {
                text: "Requesting access to email marketing",
                link: "en/email-marketing/mail-access-request",
            },
            {
                text: "Broadcasts",
                link: "en/email-marketing/broadcasts",
            },
            {
                text: "Sequences (Campaigns)",
                link: "en/email-marketing/sequences",
            },
            {
                text: "Analytics",
                link: "en/email-marketing/analytics",
            },
        ],
        Website: [
            { text: "Introduction", link: "en/website/introduction" },
            { text: "Page blocks", link: "en/website/blocks" },
            { text: "Edit page", link: "en/website/edit" },
            { text: "Themes", link: "en/website/themes" },
        ],
        Blog: [
            { text: "Introduction", link: "en/blog/introduction" },
            { text: "Publish a blog", link: "en/blog/publish" },
        ],
        School: [
            { text: "Introduction", link: "en/schools/introduction" },
            { text: "Create a school", link: "en/schools/create" },
            { text: "Use custom domain", link: "en/schools/add-custom-domain" },
            { text: "Set up payments", link: "en/schools/set-up-payments" },
            { text: "Delete a school", link: "en/schools/delete" },
        ],
        Users: [
            { text: "Introduction", link: "en/users/introduction" },
            { text: "Manage users", link: "en/users/manage" },
            { text: "User permissions", link: "en/users/permissions" },
            { text: "Filter users", link: "en/users/filters" },
            { text: "Segment users", link: "en/users/segments" },
            { text: "Delete a user", link: "en/users/delete" },
        ],
        Developers: [
            { text: "Introduction", link: "en/developers/introduction" },
            { text: "Managing users", link: "en/developers/manage-users" },
        ],
        "Self hosting": [
            { text: "Why self host?", link: "en/self-hosting/introduction" },
            { text: "Self hosting guide", link: "en/self-hosting/self-host" },
        ],
    },
};
