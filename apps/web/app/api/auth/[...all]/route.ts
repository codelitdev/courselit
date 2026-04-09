import { als } from "@/async-local-storage";
import { getBackendAddress } from "@/app/actions";
import { getAuth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

const getHandlers = (baseURL: string) => toNextJsHandler(getAuth(baseURL));

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

export const POST = async (req: Request) => {
    const rewrittenReq = await rewriteAuthRequestOrigin(req);
    const handlers = getHandlers(new URL(rewrittenReq.url).origin);
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    return als.run(map, () => handlers.POST(rewrittenReq));
};

export const GET = async (req: Request) => {
    const rewrittenReq = await rewriteAuthRequestOrigin(req);
    const handlers = getHandlers(new URL(rewrittenReq.url).origin);
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    return als.run(map, () => handlers.GET(rewrittenReq));
};
