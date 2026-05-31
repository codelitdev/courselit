import { als } from "@/async-local-storage";
import { getAuth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { rewriteAuthRequestOrigin } from "./rewrite-auth-request-origin";

const getHandlers = (baseURL: string) => toNextJsHandler(getAuth(baseURL));

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
