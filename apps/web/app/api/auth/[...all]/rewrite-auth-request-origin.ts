import { getBackendAddress } from "@/app/actions";

// This is needed to prevent creating URLs like https://0.0.0.0:3000/api/auth/sign-in/sso
export const rewriteAuthRequestOrigin = async (req: Request) => {
    const publicOrigin = await getBackendAddress(req.headers);
    const currentUrl = new URL(req.url);

    if (currentUrl.origin === publicOrigin) {
        return req;
    }

    const rewrittenUrl = new URL(
        `${currentUrl.pathname}${currentUrl.search}`,
        publicOrigin,
    );

    return new Request(rewrittenUrl, req);
};
