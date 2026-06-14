import type { Email } from "@courselit/email-editor";

interface NotificationEmailTemplateInput {
    actorName: string;
    actorAvatarUrl?: string;
    message: string;
    notificationUrl: string;
    unsubscribeUrl: string;
    hideCourseLitBranding?: boolean;
}

function encodePlainTextForMarkdown(value: string) {
    return Array.from(value)
        .map((character) => `&#${character.codePointAt(0)};`)
        .join("");
}

function getSafeAvatarUrl(actorAvatarUrl?: string) {
    if (!actorAvatarUrl) {
        return;
    }

    if (actorAvatarUrl.startsWith("/")) {
        return actorAvatarUrl;
    }

    try {
        const url = new URL(actorAvatarUrl);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return actorAvatarUrl;
        }
    } catch {
        return;
    }
}

export function buildNotificationEmailTemplate({
    actorName,
    actorAvatarUrl,
    message,
    notificationUrl,
    unsubscribeUrl,
    hideCourseLitBranding,
}: NotificationEmailTemplateInput): Email {
    const safeActorAvatarUrl = getSafeAvatarUrl(actorAvatarUrl);
    const content: Email["content"] = [];

    if (safeActorAvatarUrl) {
        content.push({
            blockType: "image",
            settings: {
                src: safeActorAvatarUrl,
                alt: `${actorName} avatar`,
                alignment: "left",
                width: "40px",
                height: "40px",
                maxWidth: "40px",
                borderRadius: "999px",
                paddingTop: "24px",
                paddingBottom: "10px",
                paddingX: "24px",
            },
        });
    }

    content.push(
        {
            blockType: "text",
            settings: {
                content: `**${encodePlainTextForMarkdown(actorName)}**`,
                fontSize: "14px",
                lineHeight: "1.4",
                paddingTop: safeActorAvatarUrl ? "0px" : "24px",
                paddingBottom: "10px",
            },
        },
        {
            blockType: "text",
            settings: {
                content: encodePlainTextForMarkdown(message),
                fontSize: "16px",
                lineHeight: "1.6",
                paddingTop: "8px",
                paddingBottom: "8px",
            },
        },
        {
            blockType: "link",
            settings: {
                text: "View notification",
                url: notificationUrl,
                alignment: "center",
                isButton: true,
                buttonColor: "#000000",
                buttonTextColor: "#ffffff",
                buttonBorderRadius: "6px",
                buttonPaddingX: "18px",
                buttonPaddingY: "10px",
                paddingTop: "12px",
                paddingBottom: "56px",
            },
        },
        {
            blockType: "separator",
            settings: {
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
        {
            blockType: "text",
            settings: {
                content: `[Unsubscribe from email notifications](${unsubscribeUrl})`,
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#666666",
                paddingTop: "32px",
                paddingBottom: hideCourseLitBranding ? "32px" : "16px",
            },
        },
    );

    if (!hideCourseLitBranding) {
        content.push({
            blockType: "link",
            settings: {
                text: "Powered by CourseLit",
                url: "https://courselit.app",
                alignment: "center",
                fontSize: "12px",
                textColor: "#000000",
                textDecoration: "none",
                buttonBorderColor: "#000000",
                paddingTop: "0px",
                paddingBottom: "40px",
            },
        });
    }

    return {
        style: {
            colors: {
                background: "#f7f7f7",
                foreground: "#000000",
                border: "#e5e5e5",
                accent: "#000000",
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
                    letterSpacing: "0px",
                    textTransform: "none",
                    textDecoration: "underline",
                },
            },
            interactives: {
                button: {
                    padding: {
                        x: "18px",
                        y: "10px",
                    },
                    border: {
                        width: "0px",
                        radius: "6px",
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
                    borderRadius: "8px",
                },
                section: {
                    padding: {
                        x: "24px",
                        y: "16px",
                    },
                },
            },
        },
        meta: {
            previewText: message,
        },
        content,
    };
}
