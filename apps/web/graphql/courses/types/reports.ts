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
import { getUser } from "@/graphql/users/logic";
import userTypes from "@/graphql/users/types";

export const courseMember = new GraphQLObjectType({
    name: "CourseMember",
    fields: {
        user: {
            type: userTypes.userType,
            resolve: (member, _, ctx: GQLContext, __) =>
                getUser(member.userId, ctx),
        },
        status: { type: userTypes.membershipStatusType },
        completedLessons: { type: new GraphQLList(GraphQLString) },
        downloaded: { type: GraphQLBoolean },
        subscriptionMethod: { type: GraphQLString },
        subscriptionId: { type: GraphQLString },
        createdAt: { type: new GraphQLNonNull(GraphQLString) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    },
});

export const student = new GraphQLObjectType({
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
