/**
 * @jest-environment jsdom
 */

import {
    COMMUNITY_POST_COMMENT_COMPOSER_ID,
    COMMUNITY_POST_REPLY_QUERY,
    communityPostHref,
    shouldFocusCommunityPostComposer,
    stripCommunityPostReplyFromUrl,
} from "../community-post-navigation";

describe("community-post-navigation", () => {
    it("builds a post path without query by default", () => {
        expect(communityPostHref("c1", "p1")).toBe(
            "/dashboard/community/c1/p1",
        );
    });

    it("adds reply=1 when focusing the composer", () => {
        expect(communityPostHref("c1", "p1", { reply: true })).toBe(
            `/dashboard/community/c1/p1?${COMMUNITY_POST_REPLY_QUERY}=1`,
        );
    });

    it("detects the reply query flag", () => {
        expect(
            shouldFocusCommunityPostComposer(new URLSearchParams("reply=1")),
        ).toBe(true);
        expect(
            shouldFocusCommunityPostComposer(new URLSearchParams("reply=0")),
        ).toBe(false);
        expect(shouldFocusCommunityPostComposer(new URLSearchParams(""))).toBe(
            false,
        );
    });

    it("strips reply while preserving other params and hash", () => {
        expect(
            stripCommunityPostReplyFromUrl(
                "/dashboard/community/c1/p1?reply=1&returnTo=%2Ffeed#comment-9",
            ),
        ).toBe("/dashboard/community/c1/p1?returnTo=%2Ffeed#comment-9");
    });

    it("exports a stable composer DOM id that is not a hash scheme", () => {
        expect(COMMUNITY_POST_COMMENT_COMPOSER_ID).toBe(
            "community-post-comment-composer",
        );
        expect(COMMUNITY_POST_COMMENT_COMPOSER_ID.includes("#")).toBe(false);
    });
});
