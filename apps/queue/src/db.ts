import mongoose from "mongoose";

export const connectToDatabase = async () => {
    const dbUri = process.env.DB_CONNECTION_STRING;

    mongoose.connection.on("connected", () => {
        console.log("Mongoose connected to the database.");
    });

    mongoose.connection.on("error", (err) => {
        console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.log("Mongoose disconnected from the database.");
        reconnect();
    });

    await connect(dbUri);
};

const connect = async (dbUri: string) => {
    try {
        await mongoose.connect(dbUri, {});
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};

const reconnect = () => {
    setTimeout(() => {
        console.log("Attempting to reconnect to the database...");
        connect(process.env.DB_CONNECTION_STRING);
    }, 5000); // Wait 5 seconds before trying to reconnect
};
