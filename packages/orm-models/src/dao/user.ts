import mongoose from "mongoose";
import { UserSchema } from "../models/user";
import type { InternalUser } from "../models/user";

const model =
    (mongoose.models.User as mongoose.Model<InternalUser>) ||
    mongoose.model<InternalUser>("User", UserSchema);

const userRepository = {
    collection: model.collection,
    model,
    get: (userId: string, domain: mongoose.Types.ObjectId) =>
        model.findOne({ userId, domain }),
    getByEmail: (email: string, domain: mongoose.Types.ObjectId) =>
        model.findOne({ email, domain }),
    getById: (id: string | mongoose.Types.ObjectId) => model.findById(id),
    queryOne: model.findOne.bind(model) as typeof model.findOne,
    query: model.find.bind(model) as typeof model.find,
    createUser: (doc: mongoose.AnyObject | mongoose.AnyObject[]) =>
        model.create(doc),
    patchOne: model.updateOne.bind(model) as typeof model.updateOne,
    patchMany: model.updateMany.bind(model) as typeof model.updateMany,
    patchOneAndGet: model.findOneAndUpdate.bind(
        model,
    ) as typeof model.findOneAndUpdate,
    removeOne: (filter: mongoose.FilterQuery<InternalUser>) =>
        model.deleteOne(filter),
    removeMany: (filter: mongoose.FilterQuery<InternalUser>) =>
        model.deleteMany(filter),
    count: (filter: mongoose.FilterQuery<InternalUser>) =>
        model.countDocuments(filter),
    aggregate: <TResult = any>(pipeline?: mongoose.PipelineStage[]) =>
        model.aggregate<TResult>(pipeline || []),
    find: model.find.bind(model) as typeof model.find,
    findOne: model.findOne.bind(model) as typeof model.findOne,
    findById: model.findById.bind(model) as typeof model.findById,
    findOneAndUpdate: model.findOneAndUpdate.bind(
        model,
    ) as typeof model.findOneAndUpdate,
    create: model.create.bind(model) as typeof model.create,
    updateOne: model.updateOne.bind(model) as typeof model.updateOne,
    updateMany: model.updateMany.bind(model) as typeof model.updateMany,
    deleteOne: model.deleteOne.bind(model) as typeof model.deleteOne,
    deleteMany: model.deleteMany.bind(model) as typeof model.deleteMany,
    countDocuments: model.countDocuments.bind(
        model,
    ) as typeof model.countDocuments,
    exists: model.exists.bind(model) as typeof model.exists,
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

export default userRepository;
export * from "../models/user";
