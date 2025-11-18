import mongoose from "mongoose";

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
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(global.__MONGO_URI__ || process.env.MONGO_URL);
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});
