/**
 * Removes the "media" widget with mediaId "dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L"
 * from page.layout and page.draftLayout arrays.
 *
 * Usage: DB_CONNECTION_STRING=<mongodb-connection-string> node 22-02-26_22-42-remove-media-widget-from-homepage.js
 */
import mongoose from "mongoose";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
if (!DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

(async () => {
    try {
        await mongoose.connect(DB_CONNECTION_STRING, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Could not connect to database");
        }

        const result = await db.collection("pages").updateMany(
            {},
            {
                $pull: {
                    layout: {
                        name: "media",
                        "settings.media.mediaId":
                            "dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L",
                    },
                    draftLayout: {
                        name: "media",
                        "settings.media.mediaId":
                            "dM3L-CVOXLGv3XxsnRUd_D3SD-S5hCkuTzTx432L",
                    },
                },
            },
        );

        console.log(
            `✅ Modified ${result.modifiedCount} page(s). Removed media widget from layout and draftLayout.`,
        );
    } finally {
        await mongoose.connection.close();
    }
})();
