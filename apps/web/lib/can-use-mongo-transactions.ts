import mongoose from "mongoose";

let supportsMongoTransactions: boolean | undefined;

export default async function canUseMongoTransactions() {
    if (typeof supportsMongoTransactions === "boolean") {
        return supportsMongoTransactions;
    }

    try {
        const hello = await mongoose.connection.db
            ?.admin()
            .command({ hello: 1 });
        supportsMongoTransactions = Boolean(
            hello?.setName || hello?.msg === "isdbgrid",
        );
    } catch (err) {
        // If capability detection itself fails, prefer the transactional path so
        // production misconfiguration fails loudly instead of silently degrading.
        supportsMongoTransactions = true;
    }

    return supportsMongoTransactions;
}
