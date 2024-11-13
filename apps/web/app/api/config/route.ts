import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    return Response.json(
        { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY },
        { status: 200 },
    );
}
