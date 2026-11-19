import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import {
    createInstructor,
    deleteInstructor,
    InstructorInput,
    updateInstructor,
} from "./logic";
import GQLContext from "@/models/GQLContext";

export default {
    createInstructor: {
        type: types.instructorType,
        args: {
            instructorData: {
                type: new GraphQLNonNull(types.instructorInputType),
            },
        },
        resolve: (
            _: unknown,
            { instructorData }: { instructorData: InstructorInput },
            ctx: GQLContext,
        ) => createInstructor({ data: instructorData, ctx }),
    },
    updateInstructor: {
        type: types.instructorType,
        args: {
            instructorId: { type: new GraphQLNonNull(GraphQLString) },
            instructorData: {
                type: new GraphQLNonNull(types.instructorInputType),
            },
        },
        resolve: (
            _: unknown,
            {
                instructorId,
                instructorData,
            }: { instructorId: string; instructorData: InstructorInput },
            ctx: GQLContext,
        ) => updateInstructor({ instructorId, data: instructorData, ctx }),
    },
    deleteInstructor: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            instructorId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: unknown,
            { instructorId }: { instructorId: string },
            ctx: GQLContext,
        ) => deleteInstructor({ instructorId, ctx }),
    },
};
