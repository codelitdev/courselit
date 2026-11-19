import { GraphQLList, GraphQLNonNull } from "graphql";
import types from "./types";
import { getInstructors } from "./logic";
import GQLContext from "@/models/GQLContext";

export default {
    getInstructors: {
        type: new GraphQLList(new GraphQLNonNull(types.instructorType)),
        resolve: (_: unknown, __: unknown, ctx: GQLContext) =>
            getInstructors(ctx),
    },
};
