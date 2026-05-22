import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/graphql/courses/logic";
import UserModel from "@models/User";
import { publicApiError, validatePublicApiRequest } from "@/app/api/public-api";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function serializeMember(member: any, user: any) {
    return {
        user: {
            userId: user.userId,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
        },
        status: member.status,
        completedLessons: member.completedLessons,
        downloaded: member.downloaded,
        subscriptionMethod: member.subscriptionMethod,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    };
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
    const url = new URL(req.url);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const requestedLimit = Number(
        url.searchParams.get("limit") || DEFAULT_LIMIT,
    );
    const limit = Math.min(
        Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 0, 1),
        MAX_LIMIT,
    );

    try {
        const members = await getMembers({
            ctx: auth.ctx as any,
            courseId: productId,
            page,
            limit,
            searchText: url.searchParams.get("search") || undefined,
        });

        const userIds = (members as any[]).map((m) => m.userId);
        const users = userIds.length
            ? await UserModel.find({
                  userId: { $in: userIds },
                  domain: (auth.ctx as any).subdomain._id,
              })
                  .select("userId email name avatar")
                  .lean()
            : [];
        const userMap = new Map(users.map((u: any) => [u.userId, u]));

        const customers = (members as any[])
            .map((member) => {
                const user = userMap.get(member.userId);
                return user ? serializeMember(member, user) : null;
            })
            .filter(Boolean);

        return NextResponse.json({
            data: customers,
            pagination: { page, limit },
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to list product customers",
            422,
        );
    }
}
