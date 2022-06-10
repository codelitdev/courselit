import fetch from "isomorphic-unfetch";
import { permissions } from "../ui-config/constants";
import { RichText as TextEditor } from "@courselit/components-library";
import type { Profile } from "@courselit/common-models";

export const queryGraphQL = async (
    url: string,
    query: Record<string, unknown>,
    token: string
) => {
    const options: Record<string, unknown> = {
        method: "POST",
        headers: token
            ? {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
              }
            : { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    };
    let response: any = await fetch(url, options);
    response = await response.json();

    if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
    }

    return response.data;
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formattedLocaleDate = (epochString: string) =>
    new Date(Number(epochString)).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

// Regex copied from: https://stackoverflow.com/a/48675160/942589
export const makeGraphQLQueryStringFromJSObject = (
    obj: Record<string, unknown>
) => JSON.stringify(obj).replace(/"([^(")"]+)":/g, "$1:");

export const formulateCourseUrl = (course: any, backend = "") =>
    `${backend}/${course.isBlog ? "post" : "course"}/${course.courseId}/${
        course.slug
    }`;

export const getPostDescriptionSnippet = (rawDraftJSContentState: any) => {
    const firstSentence = TextEditor.hydrate({ data: rawDraftJSContentState })
        .getCurrentContent()
        .getPlainText()
        .split(".")[0];

    return firstSentence ? firstSentence + "." : firstSentence;
};

export const getGraphQLQueryFields = (
    jsObj: any,
    fieldsNotPutBetweenQuotes = []
) => {
    let queryString = "{";
    for (const i of Object.keys(jsObj)) {
        if (jsObj[i] !== undefined) {
            queryString += fieldsNotPutBetweenQuotes.includes(i)
                ? `${i}: ${jsObj[i]},`
                : `${i}: "${jsObj[i]}",`;
        }
    }
    queryString += "}";

    return queryString;
};

export const getObjectContainingOnlyChangedFields = (
    baseline: Record<string, any>,
    obj: Record<string, any>
) => {
    const result: Record<string, unknown> = {};
    for (const i of Object.keys(baseline)) {
        if (baseline[i] !== obj[i]) {
            result[i] = obj[i];
        }
    }
    return result;
};

export const areObjectsDifferent = (
    baseline: Record<string, unknown>,
    obj: Record<string, unknown>
) => {
    const onlyChangedFields = getObjectContainingOnlyChangedFields(
        baseline,
        obj
    );
    return !!Object.keys(onlyChangedFields).length;
};

export const getAddress = (host: string) => {
    return {
        domain: extractDomainFromURL(host),
        backend: host,
        frontend: `http://${host}`,
    };
};

export const getBackendAddress = (host: string) => {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://${host}`;
};

export const checkPermission = (
    actualPermissions: string[],
    desiredPermissions: string[]
) =>
    actualPermissions.some((permission) =>
        desiredPermissions.includes(permission)
    );

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
