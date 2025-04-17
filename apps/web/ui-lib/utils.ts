import type {
    CommunityMemberStatus,
    CommunityReportStatus,
    Course,
    Group,
    Membership,
    MembershipRole,
    Page,
    PaymentPlan,
    Profile,
    TextEditorContent,
    Typeface,
} from "@courselit/common-models";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import { Constants, UIConstants } from "@courselit/common-models";
import { createHash, randomInt } from "crypto";
import { getProtocol } from "../lib/utils";
const { permissions } = UIConstants;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formattedLocaleDate = (
    epochString?: Date | number,
    monthFormat?: "short" | "long",
) =>
    epochString
        ? new Date(Number(epochString)).toLocaleString("en-US", {
              year: "numeric",
              month: monthFormat || "short",
              day: "numeric",
          })
        : "";

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
    headers: Record<string, unknown>,
): `${string}://${string}` => {
    return `${getProtocol(
        headers["x-forwarded-proto"] as string | string[] | undefined,
    )}://${headers.host}`;
};

const extractDomainFromURL = (host: string) => {
    return host.split(":")[0];
};

export const canAccessDashboard = (profile: Profile) => {
    return checkPermission(profile.permissions, [
        permissions.manageCourse,
        permissions.manageAnyCourse,
        permissions.manageSite,
        permissions.manageSettings,
        permissions.manageUsers,
    ]);
};

export const constructThumbnailUrlFromFileUrl = (url: string) =>
    url ? url.replace(url.split("/").pop(), "thumb.webp") : null;

export const getPage = async (
    backend: string,
    id?: string,
): Promise<
    Pick<
        Page,
        | "title"
        | "layout"
        | "pageData"
        | "description"
        | "socialImage"
        | "robotsAllowed"
    >
> => {
    const query = id
        ? `
    query {
        page: getPage(id: "${id}") {
            title,
            layout,
            pageData,
            description,
            socialImage {
                file,
                caption, 
                mimeType
            },
            robotsAllowed,
        }
    }
    `
        : `
    query {
        page: getPage {
            title,
            layout,
            description,
            socialImage {
                file,
                caption,
                mimeType
            },
            robotsAllowed,
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
    return undefined as unknown as Page;
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
        (purchase) => purchase.courseId === courseId,
    );
    if (indexOfCurrentCourse === -1) return false;
    return profile.purchases[indexOfCurrentCourse].completedLessons.some(
        (lesson) => lesson === lessonId,
    );
};

export const generateFontString = (typefaces: Typeface[]): string => {
    const fontStringPieces = [];

    for (const typeface of typefaces) {
        if (typeface.typeface !== "Roboto") {
            fontStringPieces.push(
                `family=${typeface.typeface.replace(
                    /\s/g,
                    "+",
                )}:wght@${typeface.fontWeights.join(";")}`,
            );
        }
    }

    const fontString = fontStringPieces.join("&");
    return fontString
        ? `https://fonts.googleapis.com/css2?${fontString}&display=swap`
        : "";
};

const swapMembers = (arr: any[], index1: number, index2: number): any[] => {
    if (index1 < 0 || index1 > arr.length - 1) {
        return arr;
    }
    if (index2 < 0 || index2 > arr.length - 1) {
        return arr;
    }
    [arr[index1], arr[index2]] = [arr[index2], arr[index1]];
    return arr;
};

export const moveMemberUp = (arr: any[], index: number) =>
    swapMembers(arr, index - 1, index);
export const moveMemberDown = (arr: any[], index: number) =>
    swapMembers(arr, index, index + 1);

export function generateUniquePasscode() {
    return randomInt(100000, 999999);
}

// Inspired from: https://github.com/nextauthjs/next-auth/blob/c4ad77b86762b7fd2e6362d8bf26c5953846774a/packages/next-auth/src/core/lib/utils.ts#L16
export function hashCode(code: number) {
    return createHash("sha256")
        .update(`${code}${process.env.AUTH_SECRET}`)
        .digest("hex");
}

export const sortCourseGroups = (course: Course) => {
    return course.groups.sort((a: Group, b: Group) => a.rank - b.rank);
};

export function truncate(str?: string, length?: number) {
    if (!str || !length) {
        return "";
    }
    return str.length <= length ? str : `${str.substring(0, length)}...`;
}

export function isTextEditorNonEmpty(content: TextEditorContent) {
    return (
        content?.content &&
        (!!content.content[0]?.content || content.content.length > 1)
    );
}

export function getNextStatusForCommunityMember(status: CommunityMemberStatus) {
    const statusCycle = [
        Constants.MembershipStatus.PENDING,
        Constants.MembershipStatus.ACTIVE,
        Constants.MembershipStatus.REJECTED,
    ];
    const index = statusCycle.indexOf(status);
    return statusCycle[(index + 1) % statusCycle.length];
}

export function getNextStatusForCommunityReport(status: CommunityReportStatus) {
    const statusCycle = Object.values(Constants.CommunityReportStatus);
    const index = statusCycle.indexOf(status);
    return statusCycle[(index + 1) % statusCycle.length];
}

export function getNextRoleForCommunityMember(role: MembershipRole) {
    const roleCycle = Object.values(Constants.MembershipRole);
    const index = roleCycle.indexOf(role);
    return roleCycle[(index + 1) % roleCycle.length];
}

export function getPlanPrice(plan: PaymentPlan): {
    amount: number;
    period: string;
} {
    if (!plan) {
        return { amount: 0, period: "" };
    }
    switch (plan.type) {
        case Constants.PaymentPlanType.FREE:
            return { amount: 0, period: "" };
        case Constants.PaymentPlanType.ONE_TIME:
            return { amount: plan.oneTimeAmount || 0, period: "" };
        case Constants.PaymentPlanType.SUBSCRIPTION:
            if (plan.subscriptionYearlyAmount) {
                return {
                    amount: plan.subscriptionYearlyAmount,
                    period: "/yr",
                };
            }
            return {
                amount: plan.subscriptionMonthlyAmount || 0,
                period: "/mo",
            };
        case Constants.PaymentPlanType.EMI:
            return {
                amount: plan.emiAmount || 0,
                period: "/mo",
            };
        default:
            return { amount: 0, period: "" };
    }
}

export function hasCommunityPermission(
    member: Pick<Membership, "role">,
    requiredRole: MembershipRole,
): boolean {
    const roleHierarchy = [
        Constants.MembershipRole.COMMENT,
        Constants.MembershipRole.POST,
        Constants.MembershipRole.MODERATE,
    ];
    const memberRoleIndex = roleHierarchy.indexOf(
        member.role.toLowerCase() as MembershipRole,
    );
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    return memberRoleIndex >= requiredRoleIndex;
}
