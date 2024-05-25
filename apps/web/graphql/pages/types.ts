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
        description: { type: GraphQLString },
        socialImage: { type: mediaType },
        robotsAllowed: { type: GraphQLBoolean },
    },
});

const pageInputType = new GraphQLInputObjectType({
    name: "PageInput",
    fields: {
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        layout: { type: GraphQLString },
        publish: { type: GraphQLBoolean },
    },
});

export default {
    page,
    pageInputType,
};
