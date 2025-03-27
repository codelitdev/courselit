import mongoose from "mongoose";

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const DomainSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sharedWidgets: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
});

const Domain = mongoose.model("Domain", DomainSchema);

const updateLinks = async () => {
    const domains = await Domain.find({});
    let updatedCount = 0;

    for (const domain of domains) {
        let needsUpdate = false;
        const sharedWidgets = domain.sharedWidgets || {};

        // Update header widget links
        if (sharedWidgets.header?.settings?.links) {
            sharedWidgets.header.settings.links =
                sharedWidgets.header.settings.links.map((link) => {
                    if (link.href === "/courses") {
                        needsUpdate = true;
                        return {
                            ...link,
                            href: "/products",
                            label: "Products",
                        };
                    }
                    return link;
                });
        }

        // Update any other widgets that might have /courses links
        for (const widgetKey in sharedWidgets) {
            const widget = sharedWidgets[widgetKey];
            if (widget?.settings?.links) {
                widget.settings.links = widget.settings.links.map((link) => {
                    if (link.href === "/courses") {
                        needsUpdate = true;
                        return {
                            ...link,
                            href: "/products",
                            label: "Products",
                        };
                    }
                    return link;
                });
            }
        }

        if (needsUpdate) {
            domain.markModified("sharedWidgets");
            await domain.save();
            updatedCount++;
            console.log(`Updated links for domain: ${domain.name}`);
        }
    }

    console.log(`Migration completed. Updated ${updatedCount} domains.`);
};

(async () => {
    try {
        await updateLinks();
        console.log("Migration completed successfully");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        mongoose.connection.close();
    }
})();
