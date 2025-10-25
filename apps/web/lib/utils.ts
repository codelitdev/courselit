import { UIConstants } from "@courselit/common-models";
import { createHash, randomInt } from "crypto";

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

export const generateEmailFrom = ({
    name,
    email,
}: {
    name: string;
    email: string;
}) => {
    return `${name} <${email}>`;
};

export const hasPermissionToAccessSetupChecklist = (
    userPermissions: string[],
) => {
    const { permissions } = UIConstants;
    const REQUIRED_PERMISSIONS_FOR_SETUP_CHECKLIST = [
        permissions.manageAnyCourse,
        permissions.manageSettings,
        permissions.manageSite,
        permissions.publishCourse,
    ] as const;

    return REQUIRED_PERMISSIONS_FOR_SETUP_CHECKLIST.every((perm) =>
        userPermissions.includes(perm),
    );
};

export function generateUniquePasscode() {
    return randomInt(100000, 999999);
}

// Inspired from: https://github.com/nextauthjs/next-auth/blob/c4ad77b86762b7fd2e6362d8bf26c5953846774a/packages/next-auth/src/core/lib/utils.ts#L16
export function hashCode(code: number) {
    return createHash("sha256")
        .update(`${code}${process.env.AUTH_SECRET}`)
        .digest("hex");
}
