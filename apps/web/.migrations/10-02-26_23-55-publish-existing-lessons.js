import mongoose from "mongoose";

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const LessonSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: String, required: true },
    published: { type: Boolean, required: true, default: false },
});

const Lesson = mongoose.model("Lesson", LessonSchema);

async function publishExistingLessons() {
    const lessonCount = await Lesson.countDocuments({ published: false });
    console.log(
        `🚀 Found ${lessonCount} unpublished lessons. Publishing them...`,
    );
    const result = await Lesson.updateMany(
        {
            published: false,
        },
        {
            $set: {
                published: true,
            },
        },
    );

    console.log(
        `🏁 Lesson publish migration complete. Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`,
    );
}

(async () => {
    await publishExistingLessons();
    mongoose.connection.close();
})();
