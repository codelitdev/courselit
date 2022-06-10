import mongoose from "mongoose";
import constants from "../config/constants";
import UserModel, { User } from "../models/User";

interface CreateUserProps {
    domain: mongoose.Types.ObjectId;
    email: string;
}

export async function createUser({
    domain,
    email,
}: CreateUserProps): Promise<User> {
    const newUser: User = {
        domain: domain,
        email: email,
        active: true,
        purchases: [],
        permissions: [],
    };
    const notTheFirstUserOfDomain = await UserModel.countDocuments({ domain });
    if (notTheFirstUserOfDomain) {
        newUser.permissions = [constants.permissions.enrollInCourse];
    } else {
        newUser.permissions = [
            constants.permissions.manageCourse,
            constants.permissions.manageAnyCourse,
            constants.permissions.publishCourse,
            constants.permissions.manageMedia,
            constants.permissions.manageAnyMedia,
            constants.permissions.uploadMedia,
            constants.permissions.viewAnyMedia,
            constants.permissions.manageSite,
            constants.permissions.manageSettings,
            constants.permissions.manageUsers,
        ];
    }
    return await UserModel.create(newUser);
}
