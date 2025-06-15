import { NextRequest, NextResponse } from "next/server";

/**
 * API route handler for verifying a Google reCAPTCHA v3 token.
 * Expects a POST request with a JSON body containing a `token` property.
 *
 * @param {NextRequest} request - The incoming Next.js API request object.
 * @returns {Promise<NextResponse>} A Next.js API response object.
 */
export async function POST(request: NextRequest) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error("reCAPTCHA secret key not found.");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }

    let requestBody;
    try {
        requestBody = await request.json();
    } catch (error) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }

    const { token } = requestBody;

    if (!token) {
        return NextResponse.json(
            { error: "reCAPTCHA token not found" },
            { status: 400 }
        );
    }

    const formData = `secret=${secretKey}&response=${token}`;

    try {
        const response = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            }
        );

        if (!response.ok) {
            console.error("Failed to verify reCAPTCHA token with Google");
            return NextResponse.json(
                { error: "Failed to verify reCAPTCHA token" },
                { status: 500 }
            );
        }

        const googleResponse = await response.json();
        return NextResponse.json({
            success: googleResponse.success,
            score: googleResponse.score,
            action: googleResponse.action,
            challenge_ts: googleResponse.challenge_ts,
            hostname: googleResponse.hostname,
            "error-codes": googleResponse["error-codes"],
        });
    } catch (error) {
        console.error("Error verifying reCAPTCHA token:", error);
        return NextResponse.json(
            { error: "Error verifying reCAPTCHA token" },
            { status: 500 }
        );
    }
}
