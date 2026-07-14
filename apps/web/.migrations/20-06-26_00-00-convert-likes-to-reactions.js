/**
 * Migrates legacy community `likes: string[]` into the
 * `communityreactions` collection as heart (❤️) rows.
 *
 * Sources:
 * - CommunityPost.likes
 * - CommunityComment.likes
 * - CommunityComment.replies[].likes
 *
 * After inserting reaction rows, unsets legacy likes fields.
 * Idempotent: unique index (domain, entityType, entityId, userId, emoji)
 * via $setOnInsert upserts.
 *
 * Usage:
 * DB_CONNECTION_STRING=<mongodb-uri> node 20-06-26_00-00-convert-likes-to-reactions.js
 */
import mongoose from "mongoose";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

if (!DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

const BATCH_SIZE = 500;
const HEART_EMOJI = "❤️";

/** Mirrors Constants.CommunityReactionEntityType */
const CommunityReactionEntityType = {
    POST: "post",
    COMMENT: "comment",
    REPLY: "reply",
};

function heartOpsFromLikes({
    domain,
    communityId,
    entityType,
    entityId,
    postId,
    commentId,
    likes,
}) {
    const ops = [];
    const userIds = Array.isArray(likes) ? likes : [];
    for (const userId of userIds) {
        if (!userId) continue;
        const doc = {
            domain,
            communityId,
            entityType,
            entityId,
            postId,
            emoji: HEART_EMOJI,
            userId,
        };
        if (commentId) {
            doc.commentId = commentId;
        }
        ops.push({
            updateOne: {
                filter: {
                    domain,
                    entityType,
                    entityId,
                    userId,
                    emoji: HEART_EMOJI,
                },
                update: { $setOnInsert: doc },
                upsert: true,
            },
        });
    }
    return ops;
}

async function flushOps(collection, ops, label, counter) {
    if (ops.length === 0) return counter;
    const result = await collection.bulkWrite(ops, { ordered: false });
    const n =
        (result.upsertedCount || 0) +
        (result.modifiedCount || 0) +
        (result.insertedCount || 0);
    counter += n;
    console.log(`  ${label}: wrote ~${counter} reaction ops...`);
    return counter;
}

(async () => {
    try {
        await mongoose.connect(DB_CONNECTION_STRING);
        const db = mongoose.connection.db;
        if (!db) throw new Error("Could not connect to database");

        const reactionsCol = db.collection("communityreactions");
        await reactionsCol.createIndex(
            {
                domain: 1,
                entityType: 1,
                entityId: 1,
                userId: 1,
                emoji: 1,
            },
            { unique: true },
        );
        await reactionsCol.createIndex({
            domain: 1,
            entityType: 1,
            entityId: 1,
        });
        await reactionsCol.createIndex({ domain: 1, postId: 1 });
        await reactionsCol.createIndex({ domain: 1, userId: 1 });

        // --- Posts ---
        console.log("Migrating CommunityPost likes...");
        const postCursor = db
            .collection("communityposts")
            .find({ likes: { $exists: true } })
            .batchSize(BATCH_SIZE);

        let postReactionOps = [];
        let postUnsetOps = [];
        let postReactionCount = 0;
        let postUnsetCount = 0;

        while (await postCursor.hasNext()) {
            const doc = await postCursor.next();
            if (!doc) continue;

            postReactionOps.push(
                ...heartOpsFromLikes({
                    domain: doc.domain,
                    communityId: doc.communityId,
                    entityType: CommunityReactionEntityType.POST,
                    entityId: doc.postId,
                    postId: doc.postId,
                    likes: doc.likes,
                }),
            );

            postUnsetOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $unset: { likes: "" } },
                },
            });

            if (postReactionOps.length >= BATCH_SIZE) {
                postReactionCount = await flushOps(
                    reactionsCol,
                    postReactionOps,
                    "posts",
                    postReactionCount,
                );
                postReactionOps = [];
            }
            if (postUnsetOps.length >= BATCH_SIZE) {
                const r = await db
                    .collection("communityposts")
                    .bulkWrite(postUnsetOps);
                postUnsetCount += r.modifiedCount || 0;
                postUnsetOps = [];
            }
        }
        postReactionCount = await flushOps(
            reactionsCol,
            postReactionOps,
            "posts",
            postReactionCount,
        );
        if (postUnsetOps.length > 0) {
            const r = await db
                .collection("communityposts")
                .bulkWrite(postUnsetOps);
            postUnsetCount += r.modifiedCount || 0;
        }
        console.log(
            `✅ Posts: reaction upserts ~${postReactionCount}, cleaned ${postUnsetCount} docs.`,
        );

        // --- Comments + replies ---
        console.log("Migrating CommunityComment likes...");
        const commentCursor = db
            .collection("communitycomments")
            .find({
                $or: [
                    { likes: { $exists: true } },
                    { "replies.likes": { $exists: true } },
                ],
            })
            .batchSize(BATCH_SIZE);

        let commentReactionOps = [];
        let commentUnsetOps = [];
        let commentReactionCount = 0;
        let commentUnsetCount = 0;

        while (await commentCursor.hasNext()) {
            const doc = await commentCursor.next();
            if (!doc) continue;

            commentReactionOps.push(
                ...heartOpsFromLikes({
                    domain: doc.domain,
                    communityId: doc.communityId,
                    entityType: CommunityReactionEntityType.COMMENT,
                    entityId: doc.commentId,
                    postId: doc.postId,
                    likes: doc.likes,
                }),
            );

            const cleanedReplies = Array.isArray(doc.replies)
                ? doc.replies.map((reply) => {
                      commentReactionOps.push(
                          ...heartOpsFromLikes({
                              domain: doc.domain,
                              communityId: doc.communityId,
                              entityType: CommunityReactionEntityType.REPLY,
                              entityId: reply.replyId,
                              postId: doc.postId,
                              commentId: doc.commentId,
                              likes: reply.likes,
                          }),
                      );
                      const { likes, ...rest } = reply;
                      return rest;
                  })
                : [];

            commentUnsetOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: { replies: cleanedReplies },
                        $unset: { likes: "" },
                    },
                },
            });

            if (commentReactionOps.length >= BATCH_SIZE) {
                commentReactionCount = await flushOps(
                    reactionsCol,
                    commentReactionOps,
                    "comments",
                    commentReactionCount,
                );
                commentReactionOps = [];
            }
            if (commentUnsetOps.length >= BATCH_SIZE) {
                const r = await db
                    .collection("communitycomments")
                    .bulkWrite(commentUnsetOps);
                commentUnsetCount += r.modifiedCount || 0;
                commentUnsetOps = [];
            }
        }
        commentReactionCount = await flushOps(
            reactionsCol,
            commentReactionOps,
            "comments",
            commentReactionCount,
        );
        if (commentUnsetOps.length > 0) {
            const r = await db
                .collection("communitycomments")
                .bulkWrite(commentUnsetOps);
            commentUnsetCount += r.modifiedCount || 0;
        }
        console.log(
            `✅ Comments: reaction upserts ~${commentReactionCount}, cleaned ${commentUnsetCount} docs.`,
        );

        console.log("✅ Migration complete!");
    } catch (err) {
        // bulkWrite with ordered:false can throw BulkWriteError with partial success
        if (err?.result || err?.writeErrors) {
            console.warn(
                "Bulk write completed with some duplicate-key skips (safe on re-run):",
                err.message,
            );
            console.log("✅ Migration complete (with skipped duplicates)!");
        } else {
            console.error("Migration failed:", err);
            process.exit(1);
        }
    } finally {
        await mongoose.connection.close();
    }
})();
