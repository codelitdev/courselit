import { extractReplyText } from "../extract-reply-text";

describe("extractReplyText", () => {
    it("prefers stripped reply text and otherwise removes quoted text", async () => {
        await expect(
            extractReplyText({
                strippedReply: "  Provider reply  ",
                textBody: "Ignored",
            }),
        ).resolves.toBe("Provider reply");
        await expect(
            extractReplyText({
                textBody:
                    "My direct reply\n\nOn Tue, someone wrote:\n> Original discussion",
            }),
        ).resolves.toBe("My direct reply");
    });
});
