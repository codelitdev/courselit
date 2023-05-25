import type { Profile } from "@courselit/common-models";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import { UIConstants } from "@courselit/common-models";
const { permissions } = UIConstants;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formattedLocaleDate = (epochString: Date) =>
    new Date(Number(epochString)).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

export const formulateCourseUrl = (course: any, backend = "") =>
    `${backend}/${course.isBlog ? "post" : "course"}/${course.courseId}/${
        course.slug
    }`;

export const getAddress = (host: string) => {
    return {
        domain: extractDomainFromURL(host),
        backend: host,
        frontend: `http://${host}`,
    };
};

export const getBackendAddress = (
    headers: Record<string, unknown>
): `${string}://${string}` => {
    const protocol = headers["x-forwarded-proto"] || "http";
    return `${protocol}://${headers.host}`;
};

/*
export const checkPermission = (
    actualPermissions: string[],
    desiredPermissions: string[]
) =>
    actualPermissions.some((permission) =>
        desiredPermissions.includes(permission)
    );
*/

const extractDomainFromURL = (host: string) => {
    return host.split(":")[0];
};

export const canAccessDashboard = (profile: Profile) => {
    return checkPermission(profile.permissions, [
        permissions.manageCourse,
        permissions.manageAnyCourse,
        permissions.manageMedia,
        permissions.manageAnyMedia,
        permissions.manageSite,
        permissions.manageSettings,
        permissions.manageUsers,
        permissions.viewAnyMedia,
    ]);
};

export const constructThumbnailUrlFromFileUrl = (url: string) =>
    url ? url.replace(url.split("/").pop(), "thumb.webp") : null;

export const getPage = async (backend: string, id?: string) => {
    const query = id
        ? `
    query {
        page: getPage(id: "${id}") {
            name,
            layout,
        }
    }
    `
        : `
    query {
        page: getPage {
            name,
            layout,
        }
    }
    `;
    try {
        const fetch = new FetchBuilder()
            .setUrl(`${backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        return response.page;
    } catch (e: any) {
        console.log("getPage", e.message); // eslint-disable-line no-console
    }
};

export const isEnrolled = (courseId: string, profile: Profile) =>
    profile.fetched &&
    profile.purchases.some((purchase: any) => purchase.courseId === courseId);

export const isLessonCompleted = ({
    courseId,
    lessonId,
    profile,
}: {
    courseId: string;
    lessonId: string;
    profile: Profile;
}) => {
    const indexOfCurrentCourse = profile.purchases.findIndex(
        (purchase) => purchase.courseId === courseId
    );
    if (indexOfCurrentCourse === -1) return false;
    return profile.purchases[indexOfCurrentCourse].completedLessons.some(
        (lesson) => lesson === lessonId
    );
};
