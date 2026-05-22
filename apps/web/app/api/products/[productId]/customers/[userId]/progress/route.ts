import { NextRequest, NextResponse } from "next/server";
import { findMembership } from "@/graphql/users/logic";
import UserModel from "@models/User";
import { publicApiError, validatePublicApiRequest } from "@/app/api/public-api";

function toIsoString(value?: Date | string) {
    if (!value) {
        return undefined;
    }
    return value instanceof Date ? value.toISOString() : value;
}

function serializeProgress(productId: string, purchase: any) {
    return {
        courseId: productId,
        completedLessons: purchase?.completedLessons ?? [],
        downloaded: purchase?.downloaded,
        createdAt: toIsoString(purchase?.createdAt),
        updatedAt: toIsoString(purchase?.updatedAt),
    };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; userId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, userId } = await params;

    const membership = await findMembership({
        domainId: auth.domain._id,
        userId,
        entityId: productId,
    });
    if (!membership) {
        return publicApiError("not_found", "Customer progress not found", 404);
    }

    const user = await UserModel.findOne({
        userId,
        domain: (auth.ctx as any).subdomain._id,
    });
    const purchase = user?.purchases?.find(
        (p: any) => p.courseId === productId,
    );

    return NextResponse.json(serializeProgress(productId, purchase));
}
