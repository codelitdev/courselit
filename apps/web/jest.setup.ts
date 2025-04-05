import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer;

export default async () => {
    // Set up MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri);

    // Set environment variables
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000";
};

// Clean up database after each test
export const cleanup = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};

// Close database connection and stop MongoDB Memory Server
export const teardown = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
};
