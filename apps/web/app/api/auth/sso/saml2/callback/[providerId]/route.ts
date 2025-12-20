import { als } from "@/async-local-storage";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export async function POST(req: Request) {
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    als.enterWith(map);

    return handlers.POST(req);
}

// Required: IdP-initiated flows redirect to this URL after POST
export async function GET(req: Request) {
    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    als.enterWith(map);

    const url = new URL(req.url);
    url.host = req.headers.get("x-forwarded-host") || "";
    url.protocol = req.headers.get("x-forwarded-proto") || "";
    url.port =
        process.env.NODE_ENV === "production"
            ? ""
            : req.headers.get("x-forwarded-port") || "";

    return NextResponse.redirect(new URL("/dashboard", url));
}
