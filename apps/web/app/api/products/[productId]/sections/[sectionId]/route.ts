import { NextRequest, NextResponse } from "next/server";
import { Constants } from "@courselit/common-models";
import { removeGroup, updateGroup } from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializeSection, serializeSections } from "../section-response";

const updateSectionFields = new Set(["name", "drip"]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !updateSectionFields.has(key));
}

function getDripInputError(body: Record<string, unknown>) {
    if (!Object.prototype.hasOwnProperty.call(body, "drip")) {
        return;
    }

    if (
        !body.drip ||
        typeof body.drip !== "object" ||
        Array.isArray(body.drip)
    ) {
        return "Drip must be a JSON object";
    }

    const drip = body.drip as { type?: unknown };
    if (
        drip.type &&
        !Constants.dripType.includes(
            drip.type as (typeof Constants.dripType)[number],
        )
    ) {
        return "Unsupported drip type";
    }

    if (Object.prototype.hasOwnProperty.call(drip, "email")) {
        return "Drip email configuration is not supported by the public API yet";
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; sectionId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, sectionId } = await params;
    const body = auth.body;
    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported section field: ${unsupportedField}`,
            400,
        );
    }
    const dripInputError = getDripInputError(body);
    if (dripInputError) {
        return publicApiError("bad_request", dripInputError, 400);
    }

    try {
        const product = await updateGroup({
            id: sectionId,
            courseId: productId,
            ...body,
            ctx: auth.ctx as any,
        } as any);
        if (!product) {
            return publicApiError("not_found", "Section not found", 404);
        }

        const section = serializeSections((product as any).groups).find(
            (section) => section.sectionId === sectionId,
        );

        return NextResponse.json(
            section ?? serializeSection({ id: sectionId }),
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to update section",
            422,
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; sectionId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, sectionId } = await params;

    try {
        await removeGroup(sectionId, productId, auth.ctx as any);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to delete section",
            422,
        );
    }
}
