import mongoose from "mongoose";

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const SettingsSchema = new mongoose.Schema({
    logins: { type: [String] },
});

const DomainSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    settings: SettingsSchema,
});

const Domain = mongoose.model("Domain", DomainSchema);

const addEmailLoginToDomainSettings = async () => {
    console.log("🏁 Migrating login settings");
    await Domain.updateMany({}, { $set: { "settings.logins": ["email"] } });
    console.log("🏁 Migrated login settings");
};

(async () => {
    await addEmailLoginToDomainSettings();
    mongoose.connection.close();
})();
