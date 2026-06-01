import { auth } from "@/auth";
import { getCourseOrThrow } from "@/graphql/courses/logic";
import CommunityModel, { InternalCommunity } from "@models/Community";
import UserModel from "@models/User";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

async function assertCanVisitCommunityDashboard(communityId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/");
    }

    const domainId = (session.session as any)?.domainId;
    const userId = (session.user as any)?.userId;

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: domainId,
        communityId,
        deleted: false,
    }).lean();

    if (!community?.courseId) {
        return;
    }

    const user = await UserModel.findOne({
        domain: domainId,
        userId,
        active: true,
    }).lean();

    if (!user) {
        redirect("/");
    }

    try {
        await getCourseOrThrow(
            undefined,
            {
                user,
                subdomain: {
                    _id: domainId,
                },
            } as any,
            community.courseId,
        );
    } catch {
        redirect("/dashboard/my-content");
    }
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await assertCanVisitCommunityDashboard(id);

    return children;
}
