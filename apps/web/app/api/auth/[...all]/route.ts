import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { setRequestContext } from "@/lib/auth-adapter";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

// Wrap handlers to set request context
export async function GET(req: NextRequest) {
    // Ensure domain header is available
    const domain = req.headers.get("domain");
    if (!domain) {
        // console.warn("API auth GET: No domain header found");
    }
    setRequestContext(req);
    try {
        return await handler.GET(req);
    } catch (error: any) {
        // console.error("API auth GET error:", error);
        throw error;
    } finally {
        setRequestContext(null);
    }
}

export async function POST(req: NextRequest) {
    // Ensure domain header is available
    const domain = req.headers.get("domain");
    if (!domain) {
        // console.warn("API auth POST: No domain header found");
    } else {
        // console.log("API auth POST: Domain header found:", domain);
    }
    setRequestContext(req);
    try {
        return await handler.POST(req);
    } catch (error: any) {
        // console.error("API auth POST error:", error);
        throw error;
    } finally {
        setRequestContext(null);
    }
}
