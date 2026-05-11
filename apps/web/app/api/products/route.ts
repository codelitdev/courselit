import { Constants } from "@courselit/common-models";
import { NextRequest, NextResponse } from "next/server";
import { createCourse, getProducts } from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { fetchPaymentPlans, serializeProduct } from "./product-response";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const createProductFields = new Set(["title", "type"]);

export async function GET(req: NextRequest) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const url = new URL(req.url);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const requestedLimit = Number(
        url.searchParams.get("limit") || DEFAULT_LIMIT,
    );
    const limit = Math.min(
        Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 0, 1),
        MAX_LIMIT,
    );

    const type = url.searchParams.get("type");
    const published = url.searchParams.get("published");
    const search = url.searchParams.get("search");

    try {
        const products = await getProducts({
            ctx: auth.ctx as any,
            page,
            limit,
            filterBy: type ? ([type] as any) : undefined,
            published:
                published === "true" || published === "false"
                    ? published === "true"
                    : undefined,
            searchText: search || undefined,
        });

        const productIdsWithPlans = (products as any[])
            .filter(
                (p) =>
                    p.type === Constants.CourseType.COURSE ||
                    p.type === Constants.CourseType.DOWNLOAD,
            )
            .map((p) => p.courseId);
        const plansByProductId = await fetchPaymentPlans(
            productIdsWithPlans,
            auth.domain,
        );

        return NextResponse.json({
            data: products.map((product) =>
                serializeProduct(
                    product as any,
                    plansByProductId.get((product as any).courseId),
                ),
            ),
            pagination: {
                page,
                limit,
            },
        });
    } catch (error) {
        return publicApiError("internal_error", "Internal server error", 500);
    }
}

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !createProductFields.has(key));
}

export async function POST(req: NextRequest) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
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

    if (!body.title || !body.type) {
        return publicApiError("bad_request", "Bad request", 400);
    }

    try {
        const createdProduct = await createCourse(
            {
                title: body.title as string,
                type: body.type as any,
            },
            auth.ctx as any,
        );

        return Response.json(serializeProduct(createdProduct as any), {
            status: 201,
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to create product",
            422,
        );
    }
}
