import mongoose from "mongoose";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const CourseSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        creatorId: { type: String, required: true },
        groups: [
            {
                _id: {
                    type: String,
                    required: true,
                    default: generateUniqueId,
                },
            },
        ],
    },
    {
        timestamps: true,
    },
);
const Course = mongoose.model("Course", CourseSchema);

const LessonSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: String, required: true, default: generateUniqueId },
    creatorId: { type: String, required: true },
    courseId: { type: String, required: true },
    groupId: { type: String, required: true },
});

const Lesson = mongoose.model("Lesson", LessonSchema);

async function migrateLessonCreatorIdToUserId() {
    const courses = await Course.find({});
    for (const course of courses) {
        console.log(`Updating lessons for course ${course.courseId}`);
        await Lesson.updateMany(
            {
                domain: course.domain,
                courseId: course.courseId,
            },
            {
                $set: {
                    creatorId: course.creatorId,
                },
            },
        );
        console.log(`Updated lessons for course ${course.courseId}`);
    }
}

async function deleteOrphanLessons() {
    const courses = await Course.find({}).lean();
    for (const course of courses) {
        const groupsIds = course.groups.map((group) => group._id);
        const lessons = await Lesson.find({
            domain: course.domain,
            courseId: course.courseId,
        }).lean();

        const orphanLessons = lessons.filter(
            (lesson) => !groupsIds.includes(lesson.groupId),
        );

        if (orphanLessons.length > 0) {
            console.log(
                `Detected ${orphanLessons.length} orphan lessons for course ${course.courseId}`,
            );
            const query = {
                _id: {
                    $in: orphanLessons.map((lesson) => lesson._id),
                },
            };
            await Lesson.deleteMany(query);
            console.log(
                `Deleted ${orphanLessons.length} orphan lessons for course ${course.courseId}`,
            );
        }
    }
}

(async () => {
    await migrateLessonCreatorIdToUserId();
    await deleteOrphanLessons();
    mongoose.connection.close();
})();
