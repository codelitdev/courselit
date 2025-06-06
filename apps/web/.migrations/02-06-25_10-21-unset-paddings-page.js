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

const DomainSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        sharedWidgets: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        draftSharedWidgets: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);
const Domain = mongoose.model("Domain", DomainSchema);

const unsetPaddingsOnPage = async (page, domain) => {
    console.log(`Migrating ${page.pageId} of ${page.domain}`);

    if (page.layout && page.layout.length > 0) {
        page.layout.forEach((widget) => {
            if (widget.name === "newsletter-signup") {
                widget.shared = false;
                widget.settings =
                    domain.sharedWidgets["newsletter-signup"]?.settings;
            }

            if (widget.settings) {
                delete widget.settings.horizontalPadding;
                delete widget.settings.verticalPadding;
            }
        });
    }

    if (page.draftLayout && page.draftLayout.length > 0) {
        page.draftLayout.forEach((widget) => {
            if (widget.name === "newsletter-signup") {
                widget.shared = false;
                widget.settings =
                    domain.draftSharedWidgets["newsletter-signup"]?.settings;
            }

            if (widget.settings) {
                delete widget.settings.horizontalPadding;
                delete widget.settings.verticalPadding;
            }
        });
    }

    page.markModified("layout");
    page.markModified("draftLayout");
    await page.save();
    console.log(`Migrated ${page.pageId} of ${page.domain}\n`);
};

const migratePages = async () => {
    const pages = await Page.find({});
    for (const page of pages) {
        try {
            const domain = await Domain.findOne({ _id: page.domain });
            await unsetPaddingsOnPage(page, domain);
        } catch (error) {
            console.error(`Error migrating ${page.pageId} of ${page.domain}`);
            console.error(error);
        }
    }
};

const unsetPaddingOnSharedWidgets = async (domain) => {
    console.log(`Migrating shared widgets for domain: ${domain.name}`);
    if (Object.keys(domain.sharedWidgets).length > 0) {
        for (const widget of Object.values(domain.sharedWidgets)) {
            if (widget.settings) {
                delete widget.settings.horizontalPadding;
                delete widget.settings.verticalPadding;
            }
        }
    }

    if (
        domain.draftSharedWidgets &&
        Object.keys(domain.draftSharedWidgets).length > 0
    ) {
        for (const widget of Object.values(domain.draftSharedWidgets)) {
            if (widget.settings) {
                delete widget.settings.horizontalPadding;
                delete widget.settings.verticalPadding;
            }
        }
    }

    domain.markModified("sharedWidgets");
    domain.markModified("draftSharedWidgets");
    await domain.save();
    console.log(`Migrated shared widgets for domain: ${domain.name}\n`);
};

const removeNewsLetterSignupFromSharedWidgets = async (domain) => {
    console.log(
        `Migrating news letter signup from shared widgets for domain: ${domain.name}`,
    );
    if (domain.sharedWidgets && Object.keys(domain.sharedWidgets).length > 0) {
        for (const widget of Object.values(domain.sharedWidgets)) {
            if (widget.name === "newsletter-signup") {
                delete domain.sharedWidgets[widget.name];
            }
        }
    }
    if (
        domain.draftSharedWidgets &&
        Object.keys(domain.draftSharedWidgets).length > 0
    ) {
        for (const widget of Object.values(domain.draftSharedWidgets)) {
            if (widget.name === "newsletter-signup") {
                delete domain.draftSharedWidgets[widget.name];
            }
        }
    }
    domain.markModified("sharedWidgets");
    domain.markModified("draftSharedWidgets");
    await domain.save();
    console.log(`Migrated news letter signup for domain: ${domain.name}\n`);
};

const migrateSharedWidgets = async () => {
    const domains = await Domain.find({});
    for (const domain of domains) {
        try {
            await unsetPaddingOnSharedWidgets(domain);
            await removeNewsLetterSignupFromSharedWidgets(domain);
        } catch (error) {
            console.error(
                `Error updating shared widgets for domain: ${domain.name}`,
            );
            console.error(error);
        }
    }
};

(async () => {
    await migratePages();
    await migrateSharedWidgets();
    mongoose.connection.close();
})();
