import mongoose from "mongoose";
import { nanoid } from "nanoid";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const WidgetSchema = new mongoose.Schema({
    widgetId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    deleteable: { type: Boolean, required: true, default: true },
    shared: { type: Boolean, required: true, default: false },
    settings: mongoose.Schema.Types.Mixed,
});

const MediaSchema = new mongoose.Schema({
    mediaId: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    access: { type: String, required: true, enum: ["public", "private"] },
    thumbnail: String,
    caption: String,
    file: String,
});

const PageSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        pageId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["product", "site", "blog", "community"],
            default: "product",
        },
        creatorId: { type: String, required: true },
        name: { type: String, required: true },
        layout: { type: [WidgetSchema], default: [] },
        draftLayout: { type: [WidgetSchema], default: [] },
        entityId: { type: String },
        deleteable: { type: Boolean, required: true, default: false },
        title: { type: String },
        description: String,
        socialImage: MediaSchema,
        robotsAllowed: { type: Boolean, default: true },
        draftTitle: String,
        draftDescription: String,
        draftSocialImage: MediaSchema,
        draftRobotsAllowed: Boolean,
        deleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

PageSchema.index(
    {
        domain: 1,
        pageId: 1,
    },
    { unique: true },
);

const Page = mongoose.model("Page", PageSchema);

const updateHeroVideo = async (page) => {
    console.log(`Updating homepage for domain: ${page.domain}`);
    const heroWidgets = page.layout.filter((widget) => widget.name === "hero");
    for (const heroWidget of heroWidgets) {
        heroWidget.settings.style = "normal";
        heroWidget.settings.mediaRadius = 2;
        if (
            heroWidget &&
            heroWidget.settings.youtubeLink &&
            !heroWidget.settings.youtubeLink.startsWith(
                "https://www.youtube.com/watch?v=",
            )
        ) {
            heroWidget.settings.youtubeLink = `https://www.youtube.com/watch?v=${heroWidget.settings.youtubeLink}`;
        }
    }
    const heroWidgetsDraft = page.draftLayout.filter(
        (widget) => widget.name === "hero",
    );
    for (const heroWidget of heroWidgetsDraft) {
        heroWidget.settings.style = "normal";
        heroWidget.settings.mediaRadius = 2;
        if (
            heroWidget &&
            heroWidget.settings.youtubeLink &&
            !heroWidget.settings.youtubeLink.startsWith(
                "https://www.youtube.com/watch?v=",
            )
        ) {
            heroWidget.settings.youtubeLink = `https://www.youtube.com/watch?v=${heroWidget.settings.youtubeLink}`;
        }
    }
    page.markModified("layout");
    page.markModified("draftLayout");
    await page.save();
    console.log(`Updated homepage for domain: ${page.domain}\n`);
};

const migrateHeroVideo = async () => {
    const pages = await Page.find({ pageId: "homepage" });
    for (const page of pages) {
        try {
            await updateHeroVideo(page);
        } catch (error) {
            console.error(`Error updating homepage for domain: ${page.domain}`);
            console.error(error);
        }
    }
};

(async () => {
    await migrateHeroVideo();
    mongoose.connection.close();
})();
