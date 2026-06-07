export const COURSE_VIEWER_RETURN_TO_PARAM = "returnTo";
export const COURSE_VIEWER_PREVIEW_PARAM = "preview";
export const COURSE_VIEWER_CURRENT_URL_HEADER = "x-courselit-course-viewer-url";
export const DEFAULT_COURSE_VIEWER_EXIT_PATH = "/dashboard/my-content/products";

export type CourseViewerSessionParams = {
    preview?: boolean;
    returnTo?: string | null;
};

export const isSafeCourseViewerReturnPath = (path?: string | null) => {
    if (!path) {
        return false;
    }

    if (!path.startsWith("/") || path.startsWith("//")) {
        return false;
    }

    if (path.includes("\\") || /[\u0000-\u001F\u007F]/.test(path)) {
        return false;
    }

    return path === "/dashboard" || path.startsWith("/dashboard/");
};

export const getCourseViewerReturnPath = (returnTo?: string | null) =>
    isSafeCourseViewerReturnPath(returnTo)
        ? (returnTo as string)
        : DEFAULT_COURSE_VIEWER_EXIT_PATH;

export const isCourseViewerPreviewRequested = (preview?: string | null) =>
    preview === "true";

type ReadableSearchParams = {
    get: (name: string) => string | null;
};

export const getCourseViewerSessionParams = (
    searchParams?: ReadableSearchParams | null,
): CourseViewerSessionParams => {
    if (!searchParams) {
        return {};
    }

    const returnTo = searchParams.get(COURSE_VIEWER_RETURN_TO_PARAM);
    return {
        preview: isCourseViewerPreviewRequested(
            searchParams.get(COURSE_VIEWER_PREVIEW_PARAM),
        ),
        returnTo: isSafeCourseViewerReturnPath(returnTo) ? returnTo : null,
    };
};

export const getCourseViewerSessionParamsFromUrl = (
    url?: string | null,
): CourseViewerSessionParams => {
    if (!url) {
        return {};
    }

    try {
        const parsedUrl = new URL(url, "http://localhost");
        return getCourseViewerSessionParams(parsedUrl.searchParams);
    } catch {
        return {};
    }
};

export const appendCourseViewerSessionParamsToHref = (
    href: string,
    params?: CourseViewerSessionParams,
) => {
    if (!params) {
        return href;
    }

    if (!params.preview && !isSafeCourseViewerReturnPath(params.returnTo)) {
        return href;
    }

    const [pathname, query = ""] = href.split("?");
    const searchParams = new URLSearchParams(query);

    if (params.preview) {
        searchParams.set(COURSE_VIEWER_PREVIEW_PARAM, "true");
    }

    if (isSafeCourseViewerReturnPath(params.returnTo)) {
        searchParams.set(COURSE_VIEWER_RETURN_TO_PARAM, params.returnTo!);
    }

    const serializedParams = searchParams.toString();
    return serializedParams ? `${pathname}?${serializedParams}` : pathname;
};

export const appendCourseViewerReturnToHref = (
    href: string,
    returnTo?: string | null,
) => appendCourseViewerSessionParamsToHref(href, { returnTo });
