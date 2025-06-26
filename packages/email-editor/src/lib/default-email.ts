import type { Email, EmailStyle } from "@/types/email-editor";

export const defaultStyle: EmailStyle = {
    colors: {
        background: "#ffffff",
        foreground: "#000000",
        border: "#e2e8f0",
        accent: "#0284c7",
        accentForeground: "#ffffff",
    },
    typography: {
        header: {
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0px",
            textTransform: "none",
            textDecoration: "none",
        },
        text: {
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0px",
            textTransform: "none",
            textDecoration: "none",
        },
        link: {
            fontFamily: "Arial, sans-serif",
            textDecoration: "underline",
            letterSpacing: "0px",
            textTransform: "none",
        },
    },
    interactives: {
        button: {
            padding: {
                x: "16px",
                y: "8px",
            },
            border: {
                width: "0px",
                radius: "4px",
                style: "solid",
            },
        },
        link: {
            padding: {
                x: "0px",
                y: "0px",
            },
        },
    },
    structure: {
        page: {
            background: "#ffffff",
            foreground: "#000000",
            width: "600px",
            marginY: "20px",
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "10px",
        },
        section: {
            padding: {
                x: "24px",
                y: "16px",
            },
        },
    },
};

export const defaultEmail: Email = {
    style: defaultStyle,
    meta: {
        previewText: "",
    },
    content: [
        {
            blockType: "text",
            settings: {
                content: "View in browser",
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#787878",
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
        {
            blockType: "text",
            settings: {
                content: "# Your Company Name\n\nThis is some paragraph text.",
                alignment: "left",
                fontSize: "24px",
            },
        },
        {
            blockType: "separator",
            settings: {},
        },
        {
            blockType: "text",
            settings: {
                content:
                    "Hello there,\n\nThank you for subscribing to our newsletter. We're excited to share our latest updates with you.",
            },
        },
        {
            blockType: "link",
            settings: {
                text: "Visit Our Website",
                url: "#",
                alignment: "center",
                isButton: true,
            },
        },
        {
            blockType: "link",
            settings: {
                text: "Learn more about our services",
                url: "#",
                alignment: "center",
            },
        },
        {
            blockType: "text",
            settings: {
                content: "Best regards,\nThe Team",
            },
        },
        {
            blockType: "separator",
            settings: {},
        },
        {
            blockType: "text",
            settings: {
                content:
                    "© 2025 Your Company. All rights reserved.\nUnsubscribe | Privacy Policy",
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#64748b",
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
    ],
};
