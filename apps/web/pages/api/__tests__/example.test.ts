import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

describe("Example API Route", () => {
    let mongod: MongoMemoryServer;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await mongoose.connection.collection("examples").deleteMany({});
    });

    it("should create a new example", async () => {
        const exampleData = { name: "Test Example" };
        const result = await mongoose.connection
            .collection("examples")
            .insertOne(exampleData);

        const insertedDoc = await mongoose.connection
            .collection("examples")
            .findOne({ _id: result.insertedId });
        expect(insertedDoc).toMatchObject(exampleData);
    });
});
