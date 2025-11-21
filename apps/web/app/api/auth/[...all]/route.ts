import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { runWithDomain } from "@/lib/context";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
    const domain = req.headers.get("domain");
    if (!domain) {
        return new Response("Domain header missing", { status: 400 });
    }
    const auth = await getAuth(domain);
    const handler = toNextJsHandler(auth);
    return runWithDomain(domain, () => handler.GET(req));
};

export const POST = async (req: NextRequest) => {
    const domain = req.headers.get("domain");
    if (!domain) {
        return new Response("Domain header missing", { status: 400 });
    }
    const auth = await getAuth(domain);
    const handler = toNextJsHandler(auth);
    return runWithDomain(domain, () => handler.POST(req));
};
