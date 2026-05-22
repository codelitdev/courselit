import { NextRequest, NextResponse } from "next/server";
import {
    deleteCourse,
    getCourseOrThrow,
    updateCourse,
} from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { fetchPaymentPlans, serializeProduct } from "../product-response";

const updateProductFields = new Set([
    "title",
    "slug",
    "description",
    "published",
    "privacy",
    "tags",
    "featuredImage",
]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !updateProductFields.has(key));
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
    if (!productId) {
        return publicApiError("bad_request", "Bad request", 400);
    }

    try {
        const product = await getCourseOrThrow(
            undefined,
            auth.ctx as any,
            productId,
        );

        const plansByProductId = await fetchPaymentPlans(
            [productId],
            auth.domain,
        );

        return NextResponse.json(
            serializeProduct(product as any, plansByProductId.get(productId)),
        );
    } catch (error: any) {
        return publicApiError(
            "not_found",
            error.message || "Product not found",
            404,
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
    if (!productId) {
        return publicApiError("bad_request", "Bad request", 400);
    }

    const body = auth.body;
    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported product field: ${unsupportedField}`,
            400,
        );
    }

    try {
        const product = await updateCourse(
            {
                id: productId,
                ...body,
            } as any,
            auth.ctx as any,
        );

        const plansByProductId = await fetchPaymentPlans(
            [productId],
            auth.domain,
        );

        return NextResponse.json(
            serializeProduct(product as any, plansByProductId.get(productId)),
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to update product",
            422,
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
    if (!productId) {
        return publicApiError("bad_request", "Bad request", 400);
    }

    try {
        await deleteCourse(productId, auth.ctx as any);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to delete product",
            422,
        );
    }
}
