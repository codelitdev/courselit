import type { Email } from "@courselit/email-editor";
import type { RicherNotificationContent } from "@courselit/common-logic";

interface RicherNotificationEmailInput {
    content: RicherNotificationContent;
    actorName: string;
    actorAvatarUrl?: string;
    unsubscribeUrl: string;
    hideCourseLitBranding?: boolean;
    replyToAddress?: string;
}

function encodePlainTextForMarkdown(value: string) {
    return Array.from(value)
        .map((character) => `&#${character.codePointAt(0)};`)
        .join("");
}

function getSafeAvatarUrl(actorAvatarUrl?: string) {
    if (!actorAvatarUrl) return;
    if (actorAvatarUrl.startsWith("/")) return actorAvatarUrl;
    try {
        const url = new URL(actorAvatarUrl);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return actorAvatarUrl;
        }
    } catch {
        return;
    }
}

export function buildRicherNotificationEmailTemplate({
    content,
    actorName,
    actorAvatarUrl,
    unsubscribeUrl,
    hideCourseLitBranding,
    replyToAddress,
}: RicherNotificationEmailInput): Email {
    const safeActorAvatarUrl = getSafeAvatarUrl(actorAvatarUrl);
    const emailContent: Email["content"] = [];

    // --- Header / Actor section ---
    if (safeActorAvatarUrl) {
        emailContent.push({
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

    emailContent.push({
        blockType: "text",
        settings: {
            content: `**${encodePlainTextForMarkdown(actorName)}**`,
            fontSize: "14px",
            lineHeight: "1.4",
            paddingTop: safeActorAvatarUrl ? "0px" : "24px",
            paddingBottom: "4px",
        },
    });

    // --- Notification message line ---
    emailContent.push({
        blockType: "text",
        settings: {
            content: encodePlainTextForMarkdown(content.message),
            fontSize: "16px",
            lineHeight: "1.6",
            paddingTop: "8px",
            paddingBottom: "12px",
        },
    });

    // --- Separator ---
    emailContent.push({
        blockType: "separator",
        settings: {
            paddingTop: "0px",
            paddingBottom: "0px",
        },
    });

    // --- Content details section ---
    if (content.discussionTitle) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: `**Discussion:** ${encodePlainTextForMarkdown(content.discussionTitle)}`,
                fontSize: "14px",
                lineHeight: "1.5",
                paddingTop: "16px",
                paddingBottom: "8px",
            },
        });
    }

    if (content.parentCommentContent) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: `> ${encodePlainTextForMarkdown(content.parentCommentContent)}`,
                fontSize: "13px",
                lineHeight: "1.5",
                foregroundColor: "#666666",
                paddingTop: "4px",
                paddingBottom: "8px",
            },
        });
    }

    if (content.commentContent) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: encodePlainTextForMarkdown(content.commentContent),
                fontSize: "15px",
                lineHeight: "1.6",
                paddingTop: "4px",
                paddingBottom: "16px",
            },
        });
    }

    if (content.postContent) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: encodePlainTextForMarkdown(content.postContent),
                fontSize: "14px",
                lineHeight: "1.5",
                foregroundColor: "#444444",
                paddingTop: "4px",
                paddingBottom: "16px",
            },
        });
    }

    if (content.communityName) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: `*In ${encodePlainTextForMarkdown(content.communityName)}*`,
                fontSize: "12px",
                lineHeight: "1.4",
                foregroundColor: "#888888",
                paddingTop: "0px",
                paddingBottom: "16px",
            },
        });
    }

    if (content.courseTitle) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: `*From course: ${encodePlainTextForMarkdown(content.courseTitle)}*`,
                fontSize: "12px",
                lineHeight: "1.4",
                foregroundColor: "#888888",
                paddingTop: "0px",
                paddingBottom: "16px",
            },
        });
    }

    // --- CTA Button ---
    emailContent.push({
        blockType: "link",
        settings: {
            text: "View in CourseLit",
            url: content.href,
            alignment: "center",
            isButton: true,
            buttonColor: "#000000",
            buttonTextColor: "#ffffff",
            buttonBorderRadius: "6px",
            buttonPaddingX: "18px",
            buttonPaddingY: "10px",
            paddingTop: "12px",
            paddingBottom: "24px",
        },
    });

    // --- Reply hint if reply-to is set ---
    if (replyToAddress) {
        emailContent.push({
            blockType: "text",
            settings: {
                content: "💬 Reply to this email to add a comment or reply to the discussion.",
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#888888",
                paddingTop: "8px",
                paddingBottom: "16px",
            },
        });
    }

    // --- Separator + Footer ---
    emailContent.push({
        blockType: "separator",
        settings: {
            paddingTop: "0px",
            paddingBottom: "0px",
        },
    });

    emailContent.push({
        blockType: "text",
        settings: {
            content: `[Unsubscribe from email notifications](${unsubscribeUrl})`,
            alignment: "center",
            fontSize: "12px",
            foregroundColor: "#666666",
            paddingTop: "32px",
            paddingBottom: hideCourseLitBranding ? "32px" : "16px",
        },
    });

    if (!hideCourseLitBranding) {
        emailContent.push({
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
                    padding: { x: "18px", y: "10px" },
                    border: { width: "0px", radius: "6px", style: "solid" },
                },
                link: {
                    padding: { x: "0px", y: "0px" },
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
                    padding: { x: "24px", y: "16px" },
                },
            },
        },
        meta: {
            previewText: content.commentContent || content.postContent || content.message,
        },
        content: emailContent,
    };
}
