import { NextRequest, NextResponse } from "next/server";
import { inviteCustomer, findMembership } from "@/graphql/users/logic";
import {
    publicApiError,
    validateEmail,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializeCustomer } from "../customer-response";

const customerInvitationFields = new Set(["email", "tags"]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !customerInvitationFields.has(key));
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
    const body = auth.body as { email?: string; tags?: string[] };
    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported customer invitation field: ${unsupportedField}`,
            400,
        );
    }
    if (!body.email) {
        return publicApiError("bad_request", "Email is required", 400);
    }
    const emailError = validateEmail(body.email as string);
    if (emailError) {
        return publicApiError("bad_request", emailError, 400);
    }

    try {
        const user = await inviteCustomer(
            body.email,
            body.tags || [],
            productId,
            auth.ctx as any,
        );
        const membership = await findMembership({
            domainId: auth.domain._id,
            userId: user.userId,
            entityId: productId,
        });

        return NextResponse.json(serializeCustomer(user, membership as any), {
            status: 201,
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to invite customer",
            422,
        );
    }
}
