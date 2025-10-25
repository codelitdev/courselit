"use server";

import { auth } from "@/auth";
import { getUser } from "@/graphql/users/logic";
import { Profile, User } from "@courselit/common-models";
import GQLContext from "@models/GQLContext";
import { Types } from "mongoose";

export async function getProfile(): Promise<Profile | null> {
    const session = await auth();
    if (!session) {
        return null;
    }

    const userId = (session?.user as any)?.userId;
    const domainId = (session?.user as any)?.domain;
    const user = await getUser(userId, {
        user: {
            userId,
        },
        subdomain: {
            _id: domainId,
        },
    } as GQLContext);

    if (!isSelf(user)) {
        return null;
    }

    return {
        name: user.name || "",
        id: user._id.toString(),
        fetched: true,
        purchases: user.purchases,
        email: user.email,
        bio: user.bio,
        permissions: user.permissions,
        userId: user.userId,
        subscribedToUpdates: user.subscribedToUpdates,
        avatar: user.avatar,
    };
}

function isSelf(user: any): user is User & { _id: Types.ObjectId } {
    return !!user?.userId;
}
