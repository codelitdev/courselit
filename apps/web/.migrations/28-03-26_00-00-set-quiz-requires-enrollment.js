/**
 * Sets `requiresEnrollment` to true for all quiz lessons.
 *
 * Usage:
 * DB_CONNECTION_STRING=<mongodb-connection-string> node 28-03-26_00-00-set-quiz-requires-enrollment.js
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

        const result = await db.collection("lessons").updateMany(
            { type: "quiz" },
            {
                $set: {
                    requiresEnrollment: true,
                },
            },
        );

        console.log(
            `✅ Updated quiz lessons. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
        );
    } finally {
        await mongoose.connection.close();
    }
})();
