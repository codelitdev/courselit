import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

// Suppress console.error during tests to reduce noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});

// Ensure MongoDB connection is established
// @shelf/jest-mongodb provides global.__MONGO_URI__ through globalSetup
// If not available, set up MongoDB Memory Server manually
beforeAll(async () => {
    let mongoUri = (global as any).__MONGO_URI__ || process.env.MONGO_URL;

    // If @shelf/jest-mongodb didn't set up MongoDB, do it manually
    if (!mongoUri) {
        mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
        (global as any).__MONGO_URI__ = mongoUri;
    }

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }

    // Clean up manually created MongoDB instance if it exists
    if (mongod) {
        await mongod.stop();
    }
});

// Clean up database after each test
export const cleanup = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};
