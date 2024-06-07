import {
    GraphQLBoolean,
    GraphQLInputObjectType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import mediaTypes from "../media/types";
const { mediaType } = mediaTypes;

const page = new GraphQLObjectType({
    name: "Page",
    fields: {
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        entityId: { type: GraphQLString },
        layout: { type: new GraphQLList(GraphQLJSONObject) },
        draftLayout: { type: new GraphQLList(GraphQLJSONObject) },
        pageData: { type: GraphQLJSONObject },
        deleteable: { type: new GraphQLNonNull(GraphQLBoolean) },
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        socialImage: { type: mediaType },
        robotsAllowed: { type: GraphQLBoolean },
        draftTitle: { type: GraphQLString },
        draftDescription: { type: GraphQLString },
        draftSocialImage: { type: mediaType },
        draftRobotsAllowed: { type: GraphQLBoolean },
    },
});

const pageInputType = new GraphQLInputObjectType({
    name: "PageInput",
    fields: {
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        layout: { type: GraphQLString },
    },
});

export default {
    page,
    pageInputType,
};
