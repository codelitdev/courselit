// TODO: Remove this in future
import { NextRequest } from "next/server";
import {
    MAX_BODY_SIZE_BYTES,
    validatePublicApiRequest,
} from "@/app/api/public-api";

export async function validateDomainAndApiKey(req: NextRequest) {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_SIZE_BYTES) {
        return { error: { message: "Request body too large", status: 413 } };
    }

    let body: Record<string, unknown>;
    try {
        const parsedBody = await req.json();
        if (
            !parsedBody ||
            typeof parsedBody !== "object" ||
            Array.isArray(parsedBody)
        ) {
            return {
                error: {
                    message: "Request body must be a JSON object",
                    status: 400,
                },
            };
        }
        body = parsedBody as Record<string, unknown>;
    } catch {
        return { error: { message: "Invalid JSON body", status: 400 } };
    }

    const validation = await validatePublicApiRequest(req, {
        apiKey: body.apikey as string | undefined,
    });

    if (validation.error) {
        const errorBody = await validation.error.json();
        return {
            error: {
                message:
                    errorBody.error?.message ||
                    errorBody.message ||
                    "Bad request",
                status: validation.error.status,
            },
        };
    }

    return { ...validation, body };
}
