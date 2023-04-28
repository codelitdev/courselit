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
    secure: boolean;
    redirect?: string;
}

export const generateMagicLink = ({
    token,
    hostname,
    secure = true,
    redirect,
}: MagicLinkProps) => {
    return `http${secure ? "s" : ""}://${hostname}/login?token=${token}${
        redirect ? `&redirect=${redirect}` : ""
    }`;
};
