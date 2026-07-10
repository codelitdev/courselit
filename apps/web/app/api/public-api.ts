import { NextRequest, NextResponse } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import ApiKey from "@/models/ApiKey";
import UserModel from "@models/User";

export type PublicApiErrorCode =
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "conflict"
    | "not_supported"
    | "unprocessable_entity"
    | "internal_error";

export function publicApiError(
    code: PublicApiErrorCode,
    message: string,
    status: number,
) {
    return NextResponse.json({ error: { code, message } }, { status });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
        return "Invalid email format";
    }
}

export const MAX_BODY_SIZE_BYTES = 1024 * 1024;

type PublicApiJsonObjectResult =
    | { error?: undefined; body: Record<string, unknown> }
    | { error: NextResponse; body?: undefined };

export async function parsePublicApiJsonObject(
    req: NextRequest,
): Promise<PublicApiJsonObjectResult> {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_SIZE_BYTES) {
        return {
            error: publicApiError("bad_request", "Request body too large", 413),
        };
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return {
            error: publicApiError("bad_request", "Invalid JSON body", 400),
        };
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
            error: publicApiError(
                "bad_request",
                "Request body must be a JSON object",
                400,
            ),
        };
    }

    return { body: body as Record<string, unknown> };
}

type PublicApiAuthSuccess = {
    error?: undefined;
    domain: Domain;
    user: any;
    apiKey: any;
    ctx: {
        user: any;
        subdomain: Domain;
        address: string;
    };
};

type PublicApiAuthFailure = {
    error: NextResponse;
    domain?: undefined;
    user?: undefined;
    apiKey?: undefined;
    ctx?: undefined;
};

type PublicApiAuthResult = PublicApiAuthSuccess | PublicApiAuthFailure;
type PublicApiAuthWithBodySuccess = PublicApiAuthSuccess & {
    body: Record<string, unknown>;
};
type PublicApiAuthWithBodyResult =
    | PublicApiAuthWithBodySuccess
    | PublicApiAuthFailure;

function getRequestOrigin(req: NextRequest) {
    try {
        return new URL(req.url).origin;
    } catch {
        return req.headers.get("origin") || "http://localhost";
    }
}

export async function validatePublicApiRequest(
    req: NextRequest,
    options?: { apiKey?: string },
): Promise<PublicApiAuthResult> {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return {
            error: publicApiError("not_found", "Domain not found", 404),
        };
    }

    const apiKey =
        req.headers.get("x-api-key") ??
        req.headers.get("X-API-Key") ??
        options?.apiKey;
    if (!apiKey) {
        return {
            error: publicApiError("bad_request", "Bad request", 400),
        };
    }

    const apiKeyObject = await ApiKey.findOne({
        domain: domain._id,
        key: apiKey,
    });
    if (!apiKeyObject) {
        return {
            error: publicApiError("unauthorized", "Unauthorized", 401),
        };
    }

    const user = await UserModel.findOne({
        domain: domain._id,
        email: domain.email,
    });
    if (!user) {
        return {
            error: publicApiError(
                "forbidden",
                "API key cannot be mapped to a school owner",
                403,
            ),
        };
    }

    return {
        domain,
        user,
        apiKey: apiKeyObject,
        ctx: {
            user,
            subdomain: domain,
            address: getRequestOrigin(req),
        },
    };
}

export async function validatePublicApiRequestWithJsonBody(
    req: NextRequest,
    options?: { apiKey?: string },
): Promise<PublicApiAuthWithBodyResult> {
    const auth = await validatePublicApiRequest(req, options);
    if (auth.error) {
        return auth;
    }

    const parsedBody = await parsePublicApiJsonObject(req);
    if (parsedBody.error) {
        return {
            error: parsedBody.error,
        };
    }

    return {
        ...auth,
        body: parsedBody.body,
    };
}
