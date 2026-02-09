import mongoose from "mongoose";
import { UserThemeSchema } from "../models/user-theme";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.UserTheme || mongoose.model("UserTheme", UserThemeSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/user-theme";
