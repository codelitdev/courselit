import { NextRequest, NextResponse } from "next/server";
import { addGroup, getCourseOrThrow } from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializeSections } from "./section-response";

const createSectionFields = new Set(["name"]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !createSectionFields.has(key));
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;

    try {
        const product = await getCourseOrThrow(
            undefined,
            auth.ctx as any,
            productId,
        );

        return NextResponse.json({ data: serializeSections(product.groups) });
    } catch (error) {
        return publicApiError("not_found", "Product not found", 404);
    }
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
    const body = auth.body;
    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported section field: ${unsupportedField}`,
            400,
        );
    }

    try {
        const product = await addGroup({
            id: productId,
            name: body.name as string,
            collapsed: false,
            ctx: auth.ctx as any,
        });
        if (!product) {
            return publicApiError("not_found", "Product not found", 404);
        }

        const sections = serializeSections((product as any).groups);

        return NextResponse.json(sections[sections.length - 1], {
            status: 201,
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to create section",
            422,
        );
    }
}
