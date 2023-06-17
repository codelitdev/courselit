export const capitalize = (s: string) => {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const isSubscriptionValid = (dateStr: Date): boolean => {
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
    return `${getProtocol(protocol)}://${hostname}/login?token=${token}${
        redirect ? `&redirect=${redirect}` : ""
    }`;
};

export const getProtocol = (protocol: string | string[] = "http") => {
    return protocol.includes("https") ? "https" : "http";
};
