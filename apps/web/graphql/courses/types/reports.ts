import { Course } from "@courselit/common-models";
import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import GQLContext from "../../../models/GQLContext";
import { getStudents } from "../logic";
import mediaTypes from "../../media/types";
import { getMedia } from "../../media/logic";

const student = new GraphQLObjectType({
    name: "Student",
    fields: {
        userId: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        avatar: {
            type: mediaTypes.mediaType,
            resolve: (user, _, __, ___) => getMedia(user.avatar),
        },
        progress: { type: new GraphQLList(GraphQLString) },
        signedUpOn: { type: GraphQLFloat },
        lastAccessedOn: { type: GraphQLFloat },
        downloaded: { type: GraphQLBoolean },
    },
});

export const reports = new GraphQLObjectType({
    name: "CourseReports",
    fields: {
        students: {
            type: new GraphQLList(student),
            args: {
                text: {
                    type: GraphQLString,
                },
            },
            resolve: (
                course: Course,
                { text }: { text?: string },
                ctx: GQLContext,
                __,
            ) => getStudents({ course, ctx, text }),
        },
    },
});
