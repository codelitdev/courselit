import { generateUniqueId } from "@courselit/utils";

export const homePageTemplate = [
    {
        widgetId: generateUniqueId(),
        name: "rich-text",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            text: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            {
                                type: "text",
                                text: "This is the default page created for you by CourseLit. Customize this further from the ",
                            },
                            {
                                type: "text",
                                marks: [{ type: "bold" }],
                                text: "Dashboard > Pages > Homepage > Edit",
                            },
                            { type: "text", text: "." },
                        ],
                    },
                ],
            },
            alignment: "left",
            color: "#ffffff",
            backgroundColor: "#704dff",
            horizontalPadding: 100,
            verticalPadding: 16,
            fontSize: 3,
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "hero",
        deleteable: true,
        shared: false,
        settings: {
            title: "Your Eye Catching Hero Statement Goes Here",
            description: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            { type: "text", text: "You can write " },
                            {
                                type: "text",
                                marks: [
                                    { type: "bold" },
                                    { type: "underline" },
                                ],
                                text: "rich text",
                            },
                            {
                                type: "text",
                                text: " here and also show images/videos/youtube videos alongside text, as shown here.",
                            },
                        ],
                    },
                ],
            },
            buttonAction: "/courses",
            buttonCaption: "Ask user to take action",
            youtubeLink: "VLVcZB2-udk",
            alignment: "right",
            style: "card",
            buttonForeground: "#fefbfb",
            mediaRadius: 56,
            horizontalPadding: 100,
            verticalPadding: 88,
            titleFontSize: 5,
            descriptionFontSize: 1,
            contentAlignment: "left",
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "grid",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            title: "Showcase your features",
            description: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            {
                                type: "text",
                                text: "Using this optional text, you can massage your messaging further.",
                            },
                        ],
                    },
                ],
            },
            headerAlignment: "left",
            items: [
                {
                    title: "Feature 1",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                    buttonCaption: "Call to action",
                    buttonAction: "/courses",
                },
                {
                    title: "Feature 2",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                    buttonCaption: "Call to action 2",
                    buttonAction: "/courses",
                },
                {
                    title: "Feature 3",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                    buttonCaption: "Call to action 3",
                    buttonAction: "/courses",
                },
            ],
            itemsAlignment: "center",
            horizontalPadding: 100,
            verticalPadding: 88,
            itemBorderRadius: 8,
            columns: 3,
            backgroundColor: "#f5f5f5",
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "media",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            media: {
                mediaId: "dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L",
                originalFileName: "Basics.jpg",
                mimeType: "image/jpeg",
                size: 113901,
                access: "public",
                file: "https://d27g932tzd9f7s.cloudfront.net/medialit-service/public/dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L/main.jpg",
                thumbnail:
                    "https://d27g932tzd9f7s.cloudfront.net/medialit-service/public/dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L/thumb.webp",
                caption: "",
            },
            mediaRadius: 2,
            horizontalPadding: 100,
            verticalPadding: 16,
            backgroundColor: "#171127",
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "faq",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            title: "Frequently Asked Questions",
            description: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            {
                                type: "text",
                                text: "You can use this section to address the common questions asked by your audience.",
                            },
                        ],
                    },
                ],
            },
            headerAlignment: "center",
            items: [
                {
                    title: "Question 1",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    title: "Question 2",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    title: "Question 3",
                    description: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                attrs: {
                                    dir: null,
                                    ignoreBidiAutoUpdate: null,
                                },
                                content: [
                                    {
                                        type: "text",
                                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
            horizontalPadding: 100,
            verticalPadding: 88,
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "newsletter-signup",
        deleteable: true,
        shared: true,
    },
    {
        widgetId: generateUniqueId(),
        name: "rich-text",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            text: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            {
                                type: "text",
                                marks: [{ type: "bold" }],
                                text: "There's more!",
                            },
                        ],
                    },
                ],
            },
            alignment: "center",
            horizontalPadding: 100,
            verticalPadding: 16,
            fontSize: 9,
        },
    },
    {
        widgetId: generateUniqueId(),
        name: "rich-text",
        deleteable: true,
        shared: false,
        settings: {
            pageId: "homepage",
            type: "site",
            entityId: "demo",
            text: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: { dir: null, ignoreBidiAutoUpdate: null },
                        content: [
                            {
                                type: "text",
                                text: "There are many more widgets for you to use in our page builder. Start building!",
                            },
                        ],
                    },
                ],
            },
            alignment: "center",
            color: "#525252",
            horizontalPadding: 100,
            verticalPadding: 16,
            fontSize: 5,
        },
    },
];
