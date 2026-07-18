/**
 * @jest-environment node
 */

import { Constants } from "@courselit/common-models";
import { getNotificationEmailContent } from "@courselit/common-logic";
import { JSDOM } from "jsdom";
import { addMailJob } from "../../../../domain/handler";
import { EmailChannel } from "../email";

jest.mock("@courselit/common-logic", () => ({
    getNotificationEmailContent: jest.fn(),
}));

jest.mock("../../../../domain/handler", () => ({
    addMailJob: jest.fn(),
}));

const mockedGetNotificationEmailContent =
    getNotificationEmailContent as jest.Mock;
const mockedAddMailJob = addMailJob as jest.Mock;

function makePayload(overrides: Partial<any> = {}): any {
    return {
        domain: {
            _id: "domain-id",
            name: "school",
            settings: {
                title: "School",
            },
        },
        actorUserId: "actor-id",
        actor: {
            userId: "actor-id",
            name: "Test Instructor",
            email: "instructor@example.com",
            avatar: {
                file: "https://cdn.example.com/avatar.png",
                thumbnail: "https://cdn.example.com/avatar-thumb.png",
            },
        },
        recipient: {
            userId: "recipient-id",
            email: "student@example.com",
            unsubscribeToken: "unsubscribe-token",
            subscribedToUpdates: true,
            permissions: ["course:manage_any"],
        },
        activityType: Constants.ActivityType.ENROLLED,
        entityId: "entity-id",
        entityTargetId: "target-id",
        metadata: {},
        ...overrides,
    };
}

function getVisibleEmailDocument(html: string) {
    const document = new JSDOM(html).window.document;
    document
        .querySelectorAll("[data-skip-in-text]")
        .forEach((element) => element.remove());
    document
        .querySelectorAll("br")
        .forEach((element) => element.replaceWith(" "));
    return document;
}

function getVisibleEmailText(document: Document) {
    return document.body.textContent?.replace(/\s+/g, " ").trim() || "";
}

describe("EmailChannel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PROTOCOL = "https";
        process.env.DOMAIN = "courselit.test";
        process.env.MULTITENANT = "true";
        process.env.EMAIL_FROM = "hello@courselit.test";

        mockedGetNotificationEmailContent.mockResolvedValue({
            subject:
                "Test Instructor granted your request to join Test Course community",
            message:
                "Test Instructor granted your request to join Test Course community",
            href: "https://school.courselit.test/community/post",
        });
    });

    it("renders a notification email with actor avatar, CTA, footer unsubscribe, branding, and unsubscribe headers", async () => {
        await new EmailChannel().send(makePayload());

        expect(mockedGetNotificationEmailContent).toHaveBeenCalledWith(
            expect.objectContaining({
                recipientPermissions: ["course:manage_any"],
            }),
        );

        expect(mockedAddMailJob).toHaveBeenCalledTimes(1);
        const mail = mockedAddMailJob.mock.calls[0][0];

        expect(mail.subject).toBe(
            "Test Instructor granted your request to join Test Course community",
        );
        expect(mail.body).toContain("Test Instructor");
        expect(mail.body).toContain("https://cdn.example.com/avatar.png");
        expect(mail.body).toContain("padding:24px 24px 10px 24px");
        expect(mail.body).toContain(
            "Test Instructor granted your request to join Test Course community",
        );
        expect(mail.body).toContain("View notification");
        expect(mail.body).toContain(
            "https://school.courselit.test/community/post",
        );
        expect(mail.body).toContain("Unsubscribe from email notifications");
        expect(mail.body).toContain(
            "https://school.courselit.test/api/unsubscribe/unsubscribe-token",
        );
        expect(mail.body).toContain("Powered by");
        expect(mail.body).toContain("CourseLit");
        expect(mail.body.indexOf("View notification")).toBeLessThan(
            mail.body.indexOf("Unsubscribe from email notifications"),
        );
        expect(mail.body).toContain("background-color:#000000");
        expect(mail.body).not.toContain("background-color:#07077b");
        expect(mail.body).toContain("padding:12px 24px 56px 24px");
        expect(mail.body).toContain("padding:32px 24px 16px 24px");
        expect(mail.body).toMatch(/font-size:\s*12px/);
        expect(mail.headers).toEqual({
            "List-Unsubscribe":
                "<https://school.courselit.test/api/unsubscribe/unsubscribe-token>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        });
    });

    it("omits the actor avatar image when avatar is missing", async () => {
        await new EmailChannel().send(
            makePayload({
                actor: {
                    userId: "actor-id",
                    name: "Test Instructor",
                    email: "instructor@example.com",
                    avatar: {},
                },
            }),
        );

        const mail = mockedAddMailJob.mock.calls[0][0];
        expect(mail.body).toContain("Test Instructor");
        expect(mail.body).not.toContain('alt="TI"');
        expect(mail.body).not.toContain("data:image/svg+xml");
        expect(mail.body).not.toContain("https://cdn.example.com/avatar.png");
    });

    it("renders dynamic notification text as text instead of Markdown links", async () => {
        mockedGetNotificationEmailContent.mockResolvedValue({
            subject:
                "Test Instructor replied to [a post](https://evil.example)",
            message:
                "Test Instructor replied to [a post](https://evil.example)",
            href: "https://school.courselit.test/community/post",
        });

        await new EmailChannel().send(
            makePayload({
                actor: {
                    userId: "actor-id",
                    name: "[Test Teacher](https://evil.example)",
                    email: "instructor@example.com",
                    avatar: {},
                },
            }),
        );

        const mail = mockedAddMailJob.mock.calls[0][0];
        expect(mail.body).toContain(
            "&#91;&#84;&#101;&#115;&#116;&#32;&#84;&#101;&#97;&#99;&#104;&#101;&#114;&#93;&#40;&#104;&#116;&#116;&#112;&#115;&#58;&#47;&#47;&#101;&#118;&#105;&#108;&#46;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#41;",
        );
        expect(mail.body).toContain(
            "&#84;&#101;&#115;&#116;&#32;&#73;&#110;&#115;&#116;&#114;&#117;&#99;&#116;&#111;&#114;&#32;&#114;&#101;&#112;&#108;&#105;&#101;&#100;&#32;&#116;&#111;&#32;&#91;&#97;&#32;&#112;&#111;&#115;&#116;&#93;&#40;",
        );
        expect(mail.body).not.toContain('href="https://evil.example"');
    });

    it("omits the actor avatar image when actor avatar URL uses an unsafe scheme", async () => {
        await new EmailChannel().send(
            makePayload({
                actor: {
                    userId: "actor-id",
                    name: "<Test",
                    email: "instructor@example.com",
                    avatar: {
                        file: "javascript:alert(1)",
                    },
                },
            }),
        );

        const mail = mockedAddMailJob.mock.calls[0][0];
        expect(mail.body).toContain("&#60;&#84;&#101;&#115;&#116;");
        expect(mail.body).not.toContain('alt="?"');
        expect(mail.body).not.toContain("data:image/svg+xml");
        expect(mail.body).not.toContain("javascript:alert(1)");
    });

    it("hides CourseLit branding when domain branding is hidden", async () => {
        await new EmailChannel().send(
            makePayload({
                domain: {
                    _id: "domain-id",
                    name: "school",
                    settings: {
                        title: "School",
                        hideCourseLitBranding: true,
                    },
                },
            }),
        );

        const mail = mockedAddMailJob.mock.calls[0][0];
        expect(mail.body).not.toContain("Powered by");
        expect(mail.body).not.toContain("CourseLit");
    });

    it("does not send when the recipient is unsubscribed from updates", async () => {
        await new EmailChannel().send(
            makePayload({
                recipient: {
                    userId: "recipient-id",
                    email: "student@example.com",
                    unsubscribeToken: "unsubscribe-token",
                    subscribedToUpdates: false,
                },
            }),
        );

        expect(mockedAddMailJob).not.toHaveBeenCalled();
    });

    it("does not send when the recipient cannot receive unsubscribe-managed email", async () => {
        await new EmailChannel().send(
            makePayload({
                recipient: {
                    userId: "recipient-id",
                    email: "",
                    unsubscribeToken: "unsubscribe-token",
                    subscribedToUpdates: true,
                },
            }),
        );

        await new EmailChannel().send(
            makePayload({
                recipient: {
                    userId: "recipient-id",
                    email: "student@example.com",
                    unsubscribeToken: "",
                    subscribedToUpdates: true,
                },
            }),
        );

        expect(mockedAddMailJob).not.toHaveBeenCalled();
    });

    it("does not send when notification details do not include a message and href", async () => {
        mockedGetNotificationEmailContent.mockResolvedValue({
            subject: "",
            message: "",
            href: "",
        });

        await new EmailChannel().send(makePayload());

        expect(mockedAddMailJob).not.toHaveBeenCalled();
    });

    it("renders conversation details and uses a discussion CTA", async () => {
        mockedGetNotificationEmailContent.mockResolvedValue({
            subject: "Test Instructor commented on a post",
            message: "Test Instructor commented on a post",
            href: "https://school.courselit.test/community/post",
            threadTitle: "A discussion title",
            parentAuthorName: "Jamie",
            parentText: "The parent comment",
            commentText: "A new comment\nwith another line",
            conversationLabel: "New reply",
            replyContext: {
                community: {
                    communityId: "community-id",
                    postId: "post-id",
                    parentCommentId: "comment-id",
                },
            },
        });

        await new EmailChannel().send(makePayload());

        const mail = mockedAddMailJob.mock.calls[0][0];
        const document = getVisibleEmailDocument(mail.body);
        const visibleText = getVisibleEmailText(document);

        expect(mail.subject).toBe("Test Instructor commented on a post");
        expect(visibleText).toContain("Test Instructor · New reply");
        expect(visibleText).toContain("Jamie · Earlier comment");
        expect(visibleText).toContain("The parent comment");
        expect(visibleText).toContain("A new comment with another line");
        expect(visibleText).not.toContain(
            "Test Instructor commented on a post",
        );
        expect(
            Array.from(document.querySelectorAll("div")).some(
                (element) =>
                    element.textContent?.includes("Earlier comment") &&
                    element
                        .getAttribute("style")
                        ?.includes("background-color:#f7f7f7"),
            ),
        ).toBe(true);
        expect(visibleText).toContain("View discussion");
        expect(visibleText).not.toContain("View notification");
    });

    it("labels original post context in new-comment emails", async () => {
        mockedGetNotificationEmailContent.mockResolvedValue({
            subject: "Test Instructor commented on your post",
            message: "Test Instructor commented on your post",
            href: "https://school.courselit.test/community/post",
            threadTitle: "A discussion title",
            parentAuthorName: "Jamie",
            parentText: "The original post body",
            parentLabel: "Original post",
            commentText: "A new comment",
            conversationLabel: "New comment",
            replyContext: {
                community: {
                    communityId: "community-id",
                    postId: "post-id",
                    parentCommentId: "comment-id",
                },
            },
        });

        await new EmailChannel().send(makePayload());

        const mail = mockedAddMailJob.mock.calls[0][0];
        const visibleText = getVisibleEmailText(
            getVisibleEmailDocument(mail.body),
        );

        expect(visibleText).toContain("Jamie · Original post");
        expect(visibleText).toContain("The original post body");
        expect(visibleText).toContain("A new comment");
        expect(visibleText).not.toContain("Earlier comment");
    });
});
