import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDomainId } from "./context";
import { MongoClient } from "mongodb";

export const customAdapter = (client: MongoClient) => {
    const baseAdapter = mongodbAdapter(client, {
        collectionNames: {
            user: "users",
        },
    });

    return {
        ...baseAdapter,
        findUserByEmail: async (email: string) => {
            const domainId = getDomainId();
            if (!domainId) {
                // Fallback or error? For now, fallback to global search or return null.
                // If no domain context, we probably shouldn't return a user in a multi-tenant app.
                return null;
            }

            const db = client.db();
            // Reuse existing "users" collection
            const user = await db.collection("users").findOne({
                email,
                domain: domainId,
            });

            if (!user) return null;

            // Map _id to id for better-auth if needed, though adapter might handle it.
            // Better-auth expects 'id' string. MongoDB has '_id' ObjectId.
            // The base adapter handles this mapping usually.
            // We should return the object in the format better-auth expects.
            return {
                ...user,
                id: user._id.toString(),
                emailVerified: !!user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            } as any;
        },
        createUser: async (user: any) => {
            const domainId = getDomainId();
            if (domainId) {
                user.domain = domainId;
            }
            // We need to ensure we use the "users" collection
            // baseAdapter.createUser will use the collection name configured.
            return baseAdapter.createUser(user);
        },
    };
};
