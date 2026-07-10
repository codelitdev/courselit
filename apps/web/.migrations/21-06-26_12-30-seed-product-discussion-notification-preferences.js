/**
 * Seeds granular product discussion notification preferences for existing
 * users.
 *
 * Usage: DB_CONNECTION_STRING=<mongodb-connection-string> node 21-06-26_12-30-seed-product-discussion-notification-preferences.js
 */
import mongoose from "mongoose";

const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
if (!DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

const PRODUCT_DISCUSSION_ACTIVITY_TYPES = [
    "course_discussion_comment_created",
    "course_discussion_reacted",
];
const DEFAULT_CHANNELS = ["app", "email"];
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

function getPreferenceOps({ domain, userId }) {
    return PRODUCT_DISCUSSION_ACTIVITY_TYPES.map((activityType) => ({
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
                    channels: DEFAULT_CHANNELS,
                },
            },
            upsert: true,
        },
    }));
}

async function flushBatch(batch) {
    if (!batch.length) {
        return;
    }

    await NotificationPreference.bulkWrite(batch, { ordered: false });
    batch.length = 0;
}

async function seedNotificationPreferences() {
    const cursor = User.find(
        {},
        {
            _id: 0,
            domain: 1,
            userId: 1,
        },
    )
        .lean()
        .cursor();

    let processedUsers = 0;
    let totalOps = 0;
    const batch = [];

    for await (const user of cursor) {
        const ops = getPreferenceOps({
            domain: user.domain,
            userId: user.userId,
        });

        batch.push(...ops);
        processedUsers += 1;
        totalOps += ops.length;

        if (batch.length >= BATCH_SIZE) {
            await flushBatch(batch);
        }
    }

    await flushBatch(batch);

    console.log(
        `Seeded product discussion preferences for ${processedUsers} users (${totalOps} idempotent upserts).`,
    );
}

(async () => {
    try {
        await mongoose.connect(DB_CONNECTION_STRING);

        await seedNotificationPreferences();
    } finally {
        await mongoose.connection.close();
    }
})();
