import mongoose from "mongoose";
import { MongoClient } from "mongodb";

export default async function connectToDatabase(): Promise<MongoClient> {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection.getClient() as unknown as MongoClient;
    }

    const options = {
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 5000,
    };

    const dbConnection = await mongoose.connect(
        process.env.DB_CONNECTION_STRING || "",
        options,
    );
    return dbConnection.connection.getClient() as unknown as MongoClient;
}
