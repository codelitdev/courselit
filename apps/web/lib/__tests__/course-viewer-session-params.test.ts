import {
    appendCourseViewerReturnToHref,
    appendCourseViewerSessionParamsToHref,
    COURSE_VIEWER_PREVIEW_PARAM,
    DEFAULT_COURSE_VIEWER_EXIT_PATH,
    getCourseViewerReturnPath,
    getCourseViewerSessionParams,
    getCourseViewerSessionParamsFromUrl,
    isSafeCourseViewerReturnPath,
} from "../course-viewer-session-params";

describe("course-viewer-session-params", () => {
    it("allows internal dashboard return paths", () => {
        expect(
            isSafeCourseViewerReturnPath("/dashboard/product/product-1"),
        ).toBe(true);
        expect(isSafeCourseViewerReturnPath("/dashboard")).toBe(true);
    });

    it("rejects unsafe return paths", () => {
        expect(isSafeCourseViewerReturnPath("https://evil.test")).toBe(false);
        expect(isSafeCourseViewerReturnPath("//evil.test")).toBe(false);
        expect(isSafeCourseViewerReturnPath("/checkout")).toBe(false);
        expect(isSafeCourseViewerReturnPath("/dashboard\\evil")).toBe(false);
    });

    it("uses a safe return path", () => {
        expect(getCourseViewerReturnPath("/dashboard/product/product-1")).toBe(
            "/dashboard/product/product-1",
        );
    });

    it("falls back to my content when no safe return path exists", () => {
        expect(getCourseViewerReturnPath("https://evil.test")).toBe(
            DEFAULT_COURSE_VIEWER_EXIT_PATH,
        );
    });

    it("propagates a safe return path through course viewer links", () => {
        expect(
            appendCourseViewerReturnToHref(
                "/course/test-course/course-1/lesson-1",
                "/dashboard/product/product-1",
            ),
        ).toBe(
            "/course/test-course/course-1/lesson-1?returnTo=%2Fdashboard%2Fproduct%2Fproduct-1",
        );
    });

    it("does not propagate unsafe return paths", () => {
        expect(
            appendCourseViewerReturnToHref(
                "/course/test-course/course-1/lesson-1",
                "https://evil.test",
            ),
        ).toBe("/course/test-course/course-1/lesson-1");
    });

    it("propagates registered preview and return params", () => {
        expect(
            appendCourseViewerSessionParamsToHref(
                "/course/test-course/course-1/lesson-1",
                {
                    preview: true,
                    returnTo: "/dashboard/product/product-1",
                },
            ),
        ).toBe(
            "/course/test-course/course-1/lesson-1?preview=true&returnTo=%2Fdashboard%2Fproduct%2Fproduct-1",
        );
    });

    it("drops unknown viewer params while reading session params", () => {
        const params = new URLSearchParams({
            [COURSE_VIEWER_PREVIEW_PARAM]: "true",
            returnTo: "/dashboard/product/product-1",
            discussion: "open",
        });

        expect(getCourseViewerSessionParams(params)).toEqual({
            preview: true,
            returnTo: "/dashboard/product/product-1",
        });
    });

    it("reads registered params from a current URL header value", () => {
        expect(
            getCourseViewerSessionParamsFromUrl(
                "/course/test/course-1?preview=true&returnTo=%2Fdashboard%2Fproduct%2Fproduct-1",
            ),
        ).toEqual({
            preview: true,
            returnTo: "/dashboard/product/product-1",
        });
    });
});
