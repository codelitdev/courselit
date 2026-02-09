import mongoose from "mongoose";

type RepositoryMethod =
    | "aggregate"
    | "bulkWrite"
    | "countDocuments"
    | "create"
    | "deleteMany"
    | "deleteOne"
    | "distinct"
    | "exists"
    | "find"
    | "findById"
    | "findByIdAndDelete"
    | "findByIdAndUpdate"
    | "findOne"
    | "findOneAndDelete"
    | "findOneAndUpdate"
    | "insertMany"
    | "updateMany"
    | "updateOne";

type RepositoryMethods<TModel extends mongoose.Model<any>> = Pick<
    TModel,
    RepositoryMethod
>;

export type MongooseDao<TModel extends mongoose.Model<any>> =
    RepositoryMethods<TModel> & {
        collection: TModel["collection"];
        model: TModel;
    };

export const createMongooseDao = <TModel extends mongoose.Model<any>>(
    model: TModel,
): MongooseDao<TModel> => {
    return {
        collection: model.collection,
        model,
        aggregate: model.aggregate.bind(model) as TModel["aggregate"],
        bulkWrite: model.bulkWrite.bind(model) as TModel["bulkWrite"],
        countDocuments: model.countDocuments.bind(
            model,
        ) as TModel["countDocuments"],
        create: model.create.bind(model) as TModel["create"],
        deleteMany: model.deleteMany.bind(model) as TModel["deleteMany"],
        deleteOne: model.deleteOne.bind(model) as TModel["deleteOne"],
        distinct: model.distinct.bind(model) as TModel["distinct"],
        exists: model.exists.bind(model) as TModel["exists"],
        find: model.find.bind(model) as TModel["find"],
        findById: model.findById.bind(model) as TModel["findById"],
        findByIdAndDelete: model.findByIdAndDelete.bind(
            model,
        ) as TModel["findByIdAndDelete"],
        findByIdAndUpdate: model.findByIdAndUpdate.bind(
            model,
        ) as TModel["findByIdAndUpdate"],
        findOne: model.findOne.bind(model) as TModel["findOne"],
        findOneAndDelete: model.findOneAndDelete.bind(
            model,
        ) as TModel["findOneAndDelete"],
        findOneAndUpdate: model.findOneAndUpdate.bind(
            model,
        ) as TModel["findOneAndUpdate"],
        insertMany: model.insertMany.bind(model) as TModel["insertMany"],
        updateMany: model.updateMany.bind(model) as TModel["updateMany"],
        updateOne: model.updateOne.bind(model) as TModel["updateOne"],
    };
};
