import mongoose from "mongoose";
import { nanoid } from "nanoid";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const EmailContentBlockSchema = new mongoose.Schema({
    blockType: { type: String, required: true },
    settings: { type: Object, required: true, default: () => ({}) },
});

const EmailStyleSchema = new mongoose.Schema({
    colors: { type: Object, required: true },
    typography: { type: Object, required: true },
    structure: { type: Object, required: true },
});

const EmailMetaSchema = new mongoose.Schema({
    previewText: { type: String },
    utm: { type: Object },
});

const EmailActionSchema = new mongoose.Schema({
    type: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
});

export const EmailContentSchema = new mongoose.Schema({
    content: { type: [EmailContentBlockSchema], required: true },
    style: { type: EmailStyleSchema, required: true },
    meta: { type: EmailMetaSchema, required: true },
});

export const EmailSchema = new mongoose.Schema({
    emailId: { type: String, required: true, default: generateUniqueId },
    content: { type: EmailContentSchema, required: true },
    subject: { type: String, required: true },
    delayInMillis: { type: Number, required: true, default: 86400000 },
    published: { type: Boolean, required: true, default: false },
    action: EmailActionSchema,
});

export const SequenceSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        sequenceId: {
            type: String,
            required: true,
        },
        type: { type: String, required: true },
        emails: { type: Object, required: true },
    },
    {
        timestamps: true,
    },
);

const Sequence = mongoose.model("Sequence", SequenceSchema);

const CourseSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        courseId: { type: String, required: true, default: generateUniqueId },
        title: { type: String, required: true },
        groups: [
            {
                name: { type: String, required: true },
                _id: {
                    type: String,
                    required: true,
                },
                rank: { type: Number, required: true },
                drip: new mongoose.Schema({
                    type: {
                        type: String,
                        required: true,
                    },
                    status: { type: Boolean, required: true, default: false },
                    delayInMillis: { type: Number },
                    dateInUTC: { type: Number },
                    email: { type: Object },
                }),
            },
        ],
    },
    {
        timestamps: true,
    },
);

const Course = mongoose.model("Course", CourseSchema);

const defaultEmailStyle = {
    colors: {
        background: "#ffffff",
        foreground: "#000000",
        border: "#e2e8f0",
        accent: "#0284c7",
        accentForeground: "#ffffff",
    },
    typography: {
        header: {
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0px",
            textTransform: "none",
            textDecoration: "none",
        },
        text: {
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0px",
            textTransform: "none",
            textDecoration: "none",
        },
        link: {
            fontFamily: "Arial, sans-serif",
            textDecoration: "underline",
            letterSpacing: "0px",
            textTransform: "none",
        },
    },
    interactives: {
        button: {
            padding: {
                x: "16px",
                y: "8px",
            },
            border: {
                width: "0px",
                radius: "4px",
                style: "solid",
            },
        },
        link: {
            padding: {
                x: "0px",
                y: "0px",
            },
        },
    },
    structure: {
        page: {
            background: "#ffffff",
            foreground: "#000000",
            width: "600px",
            marginY: "20px",
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "10px",
        },
        section: {
            padding: {
                x: "24px",
                y: "16px",
            },
        },
    },
};

const migrateSequenceEmail = async (sequence) => {
    console.log(
        `Migrating sequence: ${sequence.sequenceId} (${sequence.type})`,
    );
    for (const email of sequence.emails) {
        if (email.content?.style) {
            continue;
        }
        console.log(`Migrating email: ${email.emailId} (${email.subject})`);
        email.content = {
            style: defaultEmailStyle,
            meta: {
                previewText: email.previewText || "",
            },
            content: [
                {
                    blockType: "text",
                    settings: {
                        content: email.content,
                    },
                },
            ],
        };
        sequence.markModified("emails");
        await sequence.save();
    }
};

const migrateSequenceEmails = async () => {
    const sequences = await Sequence.find({});
    for (const sequence of sequences) {
        try {
            await migrateSequenceEmail(sequence);
        } catch (error) {
            console.error(`Error updating homepage for domain: ${page.domain}`);
            console.error(error);
        }
    }
};

const migrateDripCourses = async () => {
    const courses = await Course.find({});
    for (const course of courses) {
        let courseModified = false;
        for (const group of course.groups) {
            if (group.drip?.email && !group.drip.email?.content?.style) {
                console.log(
                    `Migrating drip on course: ${course.title} (${group.name})`,
                );
                group.drip.email.content = {
                    style: defaultEmailStyle,
                    meta: {
                        previewText: group.drip.email.previewText || "",
                    },
                    content: [
                        {
                            blockType: "text",
                            settings: {
                                content: group.drip.email.content,
                            },
                        },
                    ],
                };
                courseModified = true;
            }
        }
        if (courseModified) {
            course.markModified("groups");
            await course.save();
        }
    }
};

(async () => {
    await migrateSequenceEmails();
    await migrateDripCourses();
    mongoose.connection.close();
})();
