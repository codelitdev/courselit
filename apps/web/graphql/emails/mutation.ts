import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { createSubscription } from "./logic";

export default {
    createSubscription: {
        type: GraphQLBoolean,
        args: {
            email: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { email }: { email: string },
            context: GQLContext
        ) => createSubscription(email, context),
    },
};
