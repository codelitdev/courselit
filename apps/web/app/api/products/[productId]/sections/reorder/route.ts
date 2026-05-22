import { NextRequest, NextResponse } from "next/server";
import { reorderGroups } from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
    const body = auth.body as { sectionIds?: string[] };

    try {
        const product = await reorderGroups({
            courseId: productId,
            groupIds: body.sectionIds || [],
            ctx: auth.ctx as any,
        });

        return NextResponse.json(product ?? { ok: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to reorder sections",
            422,
        );
    }
}
