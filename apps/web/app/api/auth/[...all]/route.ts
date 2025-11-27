import { als } from "@/async-local-storage";
import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const POST = async (req: Request) => {
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    als.enterWith(map);

    return handlers.POST(req);
};

export const GET = async (req: Request, ...rest: any[]) => {
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    als.enterWith(map);

    return handlers.GET(req);
};
