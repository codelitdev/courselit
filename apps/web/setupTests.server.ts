import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

jest.setTimeout(30000);

function getMongoPort(basePort: number) {
    const workerId = Number(process.env.JEST_WORKER_ID || "0");
    return basePort + workerId;
}

// Suppress console.error during tests to reduce noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});

// Ensure MongoDB connection is established
beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
        instance: {
            ip: "127.0.0.1",
            port: getMongoPort(37017),
        },
    });
    const mongoUri = mongod.getUri();

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (mongod) {
        await mongod.stop({ doCleanup: true, force: true });
        mongod = null;
    }

    delete (global as any).__MONGO_URI__;
});
