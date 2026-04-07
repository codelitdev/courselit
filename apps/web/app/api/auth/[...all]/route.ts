import { als } from "@/async-local-storage";
import { getBackendAddress } from "@/app/actions";
import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

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
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    return als.run(map, () => handlers.POST(rewrittenReq));
};

export const GET = async (req: Request) => {
    const rewrittenReq = await rewriteAuthRequestOrigin(req);
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    return als.run(map, () => handlers.GET(rewrittenReq));
};
