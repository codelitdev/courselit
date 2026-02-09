"use server";

import { auth } from "@/auth";
import { getUser } from "@/graphql/users/logic";
import { Profile, User } from "@courselit/common-models";
import GQLContext from "@models/GQLContext";
import { headers } from "next/headers";

export async function getProfile(): Promise<Profile | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        return null;
    }

    const domainId = (session?.session as any)?.domainId;
    const userId = (session?.user as any)?.userId;

    try {
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
            fetched: true,
            purchases: user.purchases,
            email: user.email,
            bio: user.bio,
            permissions: user.permissions,
            userId: user.userId,
            subscribedToUpdates: user.subscribedToUpdates,
            avatar: user.avatar,
        };
    } catch (error) {
        return null;
    }
}

function isSelf(user: any): user is User {
    return !!user?.userId;
}
