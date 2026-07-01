/**
 * Converts existing `likes: string[]` fields to `reactions: { "❤️": string[] }` format
 * on CommunityPost and CommunityComment documents.
 *
 * This migration is idempotent - safe to re-run.
 *
 * Usage:
 * DB_CONNECTION_STRING=<mongodb-connection-string> node 20-06-26_00-00-convert-likes-to-reactions.js
 */
import mongoose from "mongoose";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

if (!DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

(async () => {
    try {
        await mongoose.connect(DB_CONNECTION_STRING);

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Could not connect to database");
        }

        const BATCH_SIZE = 500;
        const HEART_EMOJI = "❤️";

        // --- Migrate CommunityPost documents ---
        console.log("Migrating CommunityPost documents...");
        let postCursor = db
            .collection("communityposts")
            .find({
                $or: [
                    {
                        likes: { $exists: true },
                        $expr: { $gt: [{ $size: "$likes" }, 0] },
                    },
                ],
            })
            .batchSize(BATCH_SIZE);

        let postBatch = [];
        let postCount = 0;

        while (await postCursor.hasNext()) {
            const doc = await postCursor.next();
            if (!doc) continue;

            const update = {
                $unset: { likes: "" },
                $set: {
                    reactions: { [HEART_EMOJI]: doc.likes || [] },
                },
            };

            postBatch.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update,
                },
            });

            if (postBatch.length >= BATCH_SIZE) {
                const result = await db
                    .collection("communityposts")
                    .bulkWrite(postBatch);
                postCount += result.modifiedCount;
                console.log(
                    `  Processed ${postCount} CommunityPost documents...`,
                );
                postBatch = [];
            }
        }

        if (postBatch.length > 0) {
            const result = await db
                .collection("communityposts")
                .bulkWrite(postBatch);
            postCount += result.modifiedCount;
        }

        console.log(`✅ Migrated ${postCount} CommunityPost documents.`);

        // --- Migrate CommunityComment documents ---
        console.log("Migrating CommunityComment documents...");
        let commentCursor = db
            .collection("communitycomments")
            .find({
                $or: [
                    {
                        likes: { $exists: true },
                        $expr: { $gt: [{ $size: "$likes" }, 0] },
                    },
                ],
            })
            .batchSize(BATCH_SIZE);

        let commentBatch = [];
        let commentCount = 0;

        while (await commentCursor.hasNext()) {
            const doc = await commentCursor.next();
            if (!doc) continue;

            const update = {
                $unset: { likes: "" },
                $set: {
                    reactions: { [HEART_EMOJI]: doc.likes || [] },
                },
            };

            // Also migrate nested reply likes
            if (doc.replies && Array.isArray(doc.replies)) {
                const hasReplyLikes = doc.replies.some(
                    (reply) =>
                        reply.likes &&
                        Array.isArray(reply.likes) &&
                        reply.likes.length > 0,
                );

                if (hasReplyLikes) {
                    update.$set["replies"] = doc.replies.map((reply) => {
                        if (
                            reply.likes &&
                            Array.isArray(reply.likes) &&
                            reply.likes.length > 0
                        ) {
                            const { likes, ...rest } = reply;
                            return {
                                ...rest,
                                reactions: { [HEART_EMOJI]: likes },
                            };
                        }
                        return reply;
                    });
                }
            }

            commentBatch.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update,
                },
            });

            if (commentBatch.length >= BATCH_SIZE) {
                const result = await db
                    .collection("communitycomments")
                    .bulkWrite(commentBatch);
                commentCount += result.modifiedCount;
                console.log(
                    `  Processed ${commentCount} CommunityComment documents...`,
                );
                commentBatch = [];
            }
        }

        if (commentBatch.length > 0) {
            const result = await db
                .collection("communitycomments")
                .bulkWrite(commentBatch);
            commentCount += result.modifiedCount;
        }

        console.log(`✅ Migrated ${commentCount} CommunityComment documents.`);

        // --- Also migrate docs that have both likes and no reactions ---
        console.log(
            "Setting default reactions on documents without reactions...",
        );
        const postResult = await db
            .collection("communityposts")
            .updateMany(
                { reactions: { $exists: false } },
                { $set: { reactions: {} } },
            );
        console.log(
            `  Set default reactions on ${postResult.modifiedCount} CommunityPost documents.`,
        );

        const commentResult = db
            .collection("communitycomments")
            .updateMany(
                { reactions: { $exists: false } },
                { $set: { reactions: {} } },
            );
        const commentResult2 = await commentResult;
        console.log(
            `  Set default reactions on ${commentResult2.modifiedCount} CommunityComment documents.`,
        );

        console.log("✅ Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
})();
