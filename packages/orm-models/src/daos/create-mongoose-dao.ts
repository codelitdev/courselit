import mongoose from "mongoose";

export type MongooseDao<TModel extends mongoose.Model<any>> = TModel & {
    model: TModel;
};

export const createMongooseDao = <TModel extends mongoose.Model<any>>(
    model: TModel,
): MongooseDao<TModel> => {
    const dao = model as MongooseDao<TModel>;
    dao.model = model;
    return dao;
};
