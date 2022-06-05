import { GraphQLNonNull } from "graphql";
import types from "./types";
import { updateUser } from "./logic";

export default {
    updateUser: {
        type: types.userType,
        args: {
            userData: {
                type: new GraphQLNonNull(types.userUpdateInput),
            },
        },
        resolve: async (_: any, { userData }: any, context: any) =>
            updateUser(userData, context),
    },
};
