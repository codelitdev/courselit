import { MongoClient } from "mongodb";
import mongoose from "mongoose";

export default async function connectToDatabase(): Promise<MongoClient> {
    if (mongoose.connection.readyState >= 1) {
        return <MongoClient>mongoose.connection.getClient();
    }

    const options = {
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 5000,
    };

    const dbConnection = await mongoose.connect(
        process.env.DB_CONNECTION_STRING || "",
        options
    );
    return <MongoClient>dbConnection.connection.getClient();
}
