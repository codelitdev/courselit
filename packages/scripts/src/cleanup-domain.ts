import mongoose from "mongoose";
import { DomainSchema } from "@courselit/orm-models";

if (!process.env.DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

if (!process.argv[2]) {
    throw new Error("Domain name is not provided");
}

mongoose.connect(process.env.DB_CONNECTION_STRING);

const DomainModel = mongoose.model("Domain", DomainSchema);

async function cleanupDomain(name: string) {
    const domain = await DomainModel.findOne({ name });
    if (!domain) {
        console.log("Domain not found");
        return;
    }
    console.log(domain);
}

(async () => {
    await cleanupDomain(process.argv[2]);
    mongoose.connection.close();
})();
