import mongoose from "mongoose";
import { CommunitySchema } from "../models/community";

const model =
    mongoose.models.Community || mongoose.model("Community", CommunitySchema);

const repository = {
    collection: model.collection,
    model,
    query: model.find.bind(model) as typeof model.find,
    queryOne: model.findOne.bind(model) as typeof model.findOne,
    getById: model.findById.bind(model) as typeof model.findById,
    createOne: model.create.bind(model) as typeof model.create,
    patchOne: model.updateOne.bind(model) as typeof model.updateOne,
    patchMany: model.updateMany.bind(model) as typeof model.updateMany,
    patchOneAndGet: model.findOneAndUpdate.bind(
        model,
    ) as typeof model.findOneAndUpdate,
    removeOne: model.deleteOne.bind(model) as typeof model.deleteOne,
    removeMany: model.deleteMany.bind(model) as typeof model.deleteMany,
    count: model.countDocuments.bind(model) as typeof model.countDocuments,
    checkExists: model.exists.bind(model) as typeof model.exists,
    aggregate: model.aggregate.bind(model) as typeof model.aggregate,
    distinctValues: model.distinct.bind(model) as typeof model.distinct,
    bulkPatch: model.bulkWrite.bind(model) as typeof model.bulkWrite,
    createMany: model.insertMany.bind(model) as typeof model.insertMany,
    paginatedFind: async (
        filter: Record<string, unknown>,
        options: {
            page?: number;
            limit?: number;
            sort?: number;
        } = {},
    ) => {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const sort = options.sort === 1 ? 1 : -1;
        const skip = (page - 1) * limit;

        return await model
            .find(filter)
            .sort({ createdAt: sort })
            .skip(skip)
            .limit(limit)
            .exec();
    },
    saveOne: async (entity: any) => {
        if (entity?.save) {
            return await entity.save();
        }

        if (entity?._id) {
            await model.updateOne({ _id: entity._id }, { $set: entity });
            return await model.findById(entity._id);
        }

        throw new Error("Cannot save entity without _id");
    },
    removeDoc: async (entity: any) => {
        if (entity?.deleteOne) {
            return await entity.deleteOne();
        }

        if (entity?._id) {
            return await model.deleteOne({ _id: entity._id });
        }

        throw new Error("Cannot delete entity without _id");
    },
};

export default repository;
export * from "../models/community";
