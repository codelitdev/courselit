import { NextRequest } from "next/server";
import { error } from "@/services/logger";

const validateTurnstileToken = async (token: string) => {
    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

    if (!SECRET_KEY) {
        throw new Error("Turnstile: No secret key found");
    }

    const formData = new FormData();
    formData.append("secret", SECRET_KEY || "");
    formData.append("response", token || "");

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
        body: formData,
        method: "POST",
    });

    const outcome = await result.json();
    if (outcome.success) {
        return true;
    }
    if (
        outcome["error-codes"] &&
        outcome["error-codes"][0] === "timeout-or-duplicate"
    ) {
        return true;
    }

    error(`Turnstile validation failed`, outcome);
    return false;
};

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { token } = body;

    const verifyTurnstileToken = await validateTurnstileToken(token);
    if (verifyTurnstileToken) {
        return Response.json({ success: true });
    }
    return Response.json({ success: false }, { status: 403 });
}
