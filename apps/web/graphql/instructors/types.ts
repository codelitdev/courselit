import {
    GraphQLInputObjectType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import GQLContext from "@/models/GQLContext";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
import { canSeeInstructorUserLink } from "./logic";

const instructorLinkType = new GraphQLObjectType({
    name: "InstructorLink",
    fields: {
        label: { type: new GraphQLNonNull(GraphQLString) },
        url: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const instructorLinkInputType = new GraphQLInputObjectType({
    name: "InstructorLinkInput",
    fields: {
        label: { type: new GraphQLNonNull(GraphQLString) },
        url: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const instructorType = new GraphQLObjectType({
    name: "Instructor",
    fields: {
        instructorId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        bio: { type: GraphQLString },
        avatar: {
            type: mediaTypes.mediaType,
            resolve: (instructor) => getMedia(instructor.avatar),
        },
        links: {
            type: new GraphQLNonNull(new GraphQLList(instructorLinkType)),
            resolve: (instructor) => instructor.links ?? [],
        },
        // Only visible to people who manage courses.
        userId: {
            type: GraphQLString,
            resolve: (instructor, _, ctx: GQLContext) =>
                canSeeInstructorUserLink(ctx)
                    ? (instructor.userId ?? null)
                    : null,
        },
    },
});

const instructorInputType = new GraphQLInputObjectType({
    name: "InstructorInput",
    fields: {
        name: { type: GraphQLString },
        bio: { type: GraphQLString },
        avatar: { type: mediaTypes.mediaInputType },
        links: {
            type: new GraphQLList(new GraphQLNonNull(instructorLinkInputType)),
        },
        userId: { type: GraphQLString },
    },
});

export default {
    instructorType,
    instructorInputType,
};
