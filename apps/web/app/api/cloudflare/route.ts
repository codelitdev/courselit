import { NextRequest } from "next/server";
import { validateTurnstileToken } from "@courselit/utils";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { token } = body;

    const verifyTurnstileToken = await validateTurnstileToken(token);
    if (verifyTurnstileToken) {
        return Response.json({ success: true });
    }
    return Response.json({ success: false }, { status: 403 });
}
