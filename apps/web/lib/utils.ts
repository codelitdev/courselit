import { Group } from "@courselit/common-models";
import { Course } from "@models/Course";

export const capitalize = (s: string) => {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const isDateInFuture = (dateStr: Date): boolean => {
    return new Date(dateStr).getTime() > new Date().getTime();
};

interface MagicLinkProps {
    token: string;
    hostname: string;
    protocol: string | string[] | undefined;
    redirect?: string;
}

export const generateMagicLink = ({
    token,
    hostname,
    protocol,
    redirect,
}: MagicLinkProps) => {
    return `${getAddress(hostname, protocol)}/login?token=${token}${
        redirect ? `&redirect=${redirect}` : ""
    }`;
};

export const getAddress = (
    hostname: string,
    protocol: string | string[] = "http",
) => `${getProtocol(protocol)}://${hostname}`;

export const getProtocol = (protocol: string | string[] = "http") => {
    return protocol.includes("https") ? "https" : "http";
};

export const sortCourseGroups = (course: Course) => {
    return course.groups.sort((a: Group, b: Group) => a.rank - b.rank);
};
