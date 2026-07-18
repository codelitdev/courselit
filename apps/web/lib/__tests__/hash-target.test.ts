/**
 * @jest-environment jsdom
 */

import {
    focusHashTarget,
    getCurrentHashTargetId,
    scheduleScrollToHashTarget,
    scrollToHashTarget,
} from "../hash-target";

describe("hash-target", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        window.history.pushState({}, "", "/test");
        Element.prototype.scrollIntoView = jest.fn();
    });

    describe("getCurrentHashTargetId", () => {
        it("returns empty string when there is no hash", () => {
            expect(getCurrentHashTargetId()).toBe("");
        });

        it("returns the fragment without leading #", () => {
            window.history.pushState({}, "", "/test#comment-1");
            expect(getCurrentHashTargetId()).toBe("comment-1");
        });

        it("uses only the first fragment when the hash is malformed", () => {
            window.history.pushState(
                {},
                "",
                "/test#comment-1#community-post-comment-composer",
            );
            expect(getCurrentHashTargetId()).toBe("comment-1");
        });
    });

    describe("scrollToHashTarget", () => {
        it("scrolls and highlights when the element exists", () => {
            document.body.innerHTML = `<div id="target-1"></div>`;
            const el = document.getElementById("target-1")!;

            expect(scrollToHashTarget({ targetId: "target-1" })).toBe(true);
            expect(el.scrollIntoView).toHaveBeenCalledWith({
                behavior: "smooth",
                block: "center",
            });
            expect(el.classList.contains("bg-accent/40")).toBe(true);
        });

        it("returns false when the element is missing", () => {
            expect(scrollToHashTarget({ targetId: "missing" })).toBe(false);
        });
    });

    describe("scheduleScrollToHashTarget", () => {
        it("cancels pending frames on cleanup", () => {
            const cancel = scheduleScrollToHashTarget({ targetId: "x" });
            expect(() => cancel()).not.toThrow();
        });
    });

    describe("focusHashTarget", () => {
        it("sets a clean single hash", () => {
            focusHashTarget({ targetId: "discussion-comment-1" });
            expect(window.location.hash).toBe("#discussion-comment-1");
        });

        it("strips leading # and stacked fragments when writing", () => {
            focusHashTarget({
                targetId: "#a#b",
            });
            expect(window.location.hash).toBe("#a");
        });

        it("dispatches an optional event for pushState listeners", () => {
            const handler = jest.fn();
            window.addEventListener("community-comment-target-change", handler);
            focusHashTarget({
                targetId: "c1",
                eventName: "community-comment-target-change",
            });
            expect(handler).toHaveBeenCalled();
            window.removeEventListener(
                "community-comment-target-change",
                handler,
            );
        });
    });
});
