/**
 * Seeds general notification preferences for existing users and
 * deletes legacy notifications that depend on `entityAction`.
 *
 * Usage: DB_CONNECTION_STRING=<mongodb-connection-string> node 17-02-26_18-10-seed-notification-preferences.js
 */
import mongoose from "mongoose";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
if (!DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

const NotificationChannel = {
    APP: "app",
    EMAIL: "email",
};

const GeneralActivityTypes = [
    "community_post_created",
    "community_post_liked",
    "community_comment_created",
    "community_comment_replied",
    "community_comment_liked",
    "community_reply_created",
    "community_reply_liked",
    "community_membership_granted",
];
const BATCH_SIZE = 500;

const UserSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
});

const NotificationPreferenceSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        activityType: { type: String, required: true },
        channels: { type: [String], default: [] },
    },
    {
        timestamps: true,
    },
);

NotificationPreferenceSchema.index(
    {
        domain: 1,
        userId: 1,
        activityType: 1,
    },
    {
        unique: true,
    },
);

const User = mongoose.model("User", UserSchema);
const NotificationPreference = mongoose.model(
    "NotificationPreference",
    NotificationPreferenceSchema,
);

function getDefaultPreferenceOps({ domain, userId }) {
    return GeneralActivityTypes.map((activityType) => ({
        updateOne: {
            filter: {
                domain,
                userId,
                activityType,
            },
            update: {
                $setOnInsert: {
                    domain,
                    userId,
                    activityType,
                    channels: [
                        NotificationChannel.APP,
                        NotificationChannel.EMAIL,
                    ],
                },
            },
            upsert: true,
        },
    }));
}

async function deleteLegacyNotifications(db) {
    const deleteLegacyNotificationsResult = await db
        .collection("notifications")
        .deleteMany({
            entityAction: {
                $exists: true,
            },
        });

    console.log(
        `🧹 Deleted ${deleteLegacyNotificationsResult.deletedCount || 0} legacy notifications containing entityAction.`,
    );
}

async function seedNotificationPreferences() {
    const cursor = User.find(
        {},
        {
            _id: 0,
            domain: 1,
            userId: 1,
        },
    ).cursor();

    let processedUsers = 0;
    let totalOps = 0;
    let batch = [];

    for await (const user of cursor) {
        const ops = getDefaultPreferenceOps({
            domain: user.domain,
            userId: user.userId,
        });

        processedUsers += 1;
        totalOps += ops.length;
        batch.push(...ops);

        if (batch.length >= BATCH_SIZE) {
            await NotificationPreference.bulkWrite(batch, { ordered: false });
            batch = [];
        }
    }

    if (batch.length) {
        await NotificationPreference.bulkWrite(batch, { ordered: false });
    }

    console.log(
        `✅ Seeded notification preferences for ${processedUsers} users (${totalOps} activity preference upserts).`,
    );
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

        await deleteLegacyNotifications(db);
        await seedNotificationPreferences();
    } finally {
        await mongoose.connection.close();
    }
})();
