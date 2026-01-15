import constants from "@config/constants";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    return Response.json(
        {
            turnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
            cacheEnabled: constants.cacheEnabled,
        },
        { status: 200 },
    );
}
