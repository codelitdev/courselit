/**
 * Copies pageId to slug for all existing communities that don't have a slug.
 * Must run BEFORE deploying the new code, since `slug` is `required: true`
 * on the Community model.
 *
 * Usage: DB_CONNECTION_STRING=<mongodb-connection-string> node 24-02-26_00-00-copy-pageid-to-slug-communities.js
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
        if (!db) throw new Error("Could not connect to database");

        const result = await db.collection("communities").updateMany(
            { slug: { $exists: false } },
            [{ $set: { slug: "$pageId" } }], // aggregation pipeline: copy field value
        );

        console.log(
            `✅ Updated ${result.modifiedCount} communities: copied pageId → slug`,
        );
    } finally {
        await mongoose.connection.close();
    }
})();
