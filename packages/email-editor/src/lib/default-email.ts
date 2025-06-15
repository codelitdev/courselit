import type { Email, Style } from "@/types/email-editor";
import { v4 as uuidv4 } from "uuid";

export const defaultStyle: Style = {
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
            fontSize: "24px",
            fontWeight: "600",
            lineHeight: "1.2",
        },
        text: {
            fontFamily: "Arial, sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "1.5",
        },
        link: {
            fontFamily: "Arial, sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "1.5",
            textDecoration: "underline",
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
            background: "#f8fafc",
            foreground: "#000000",
            width: "600px",
            marginY: "20px",
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
            id: uuidv4(),
            blockType: "text",
            settings: {
                content: "View in browser",
                alignment: "center",
                backgroundColor: "#f8fafc",
                paddingTop: "8px",
                paddingBottom: "8px",
                foregroundColor: "#64748b",
                fontSize: "12px",
            },
        },
        {
            id: uuidv4(),
            blockType: "text",
            settings: {
                content: "Your Company Name",
                alignment: "center",
                fontFamily: "Arial, sans-serif",
                fontSize: "24px",
                fontWeight: "600",
                paddingTop: "24px",
                paddingBottom: "8px",
            },
        },
        {
            id: uuidv4(),
            blockType: "separator",
            settings: {
                color: "#e2e8f0",
                thickness: "1px",
                style: "solid",
                marginY: "16px",
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
        {
            id: uuidv4(),
            blockType: "text",
            settings: {
                content:
                    "Hello there,\n\nThank you for subscribing to our newsletter. We're excited to share our latest updates with you.",
                paddingTop: "16px",
                paddingBottom: "16px",
            },
        },
        {
            id: uuidv4(),
            blockType: "link",
            settings: {
                text: "Visit Our Website",
                url: "#",
                alignment: "center",
                isButton: true,
                buttonColor: "#0284c7",
                buttonTextColor: "#ffffff",
                buttonPaddingY: "12px",
                buttonPaddingX: "24px",
                buttonBorderRadius: "6px",
                fontSize: "16px",
                fontWeight: "500",
                paddingTop: "16px",
                paddingBottom: "16px",
            },
        },
        {
            id: uuidv4(),
            blockType: "link",
            settings: {
                text: "Learn more about our services",
                url: "#",
                alignment: "center",
                textColor: "#0284c7",
                paddingTop: "16px",
                paddingBottom: "16px",
            },
        },
        {
            id: uuidv4(),
            blockType: "text",
            settings: {
                content: "Best regards,\nThe Team",
                paddingTop: "16px",
                paddingBottom: "16px",
            },
        },
        {
            id: uuidv4(),
            blockType: "separator",
            settings: {
                color: "#e2e8f0",
                thickness: "1px",
                style: "solid",
                marginY: "16px",
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
        {
            id: uuidv4(),
            blockType: "text",
            settings: {
                content:
                    "© 2025 Your Company. All rights reserved.\nUnsubscribe | Privacy Policy",
                alignment: "center",
                fontSize: "12px",
                textColor: "#64748b",
                paddingTop: "8px",
                paddingBottom: "8px",
            },
        },
    ],
};
