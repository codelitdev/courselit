import {
    GraphQLBoolean,
    GraphQLInputObjectType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import constants from "../../config/constants";
const { product, site } = constants;

const page = new GraphQLObjectType({
    name: "Page",
    fields: {
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        entityId: { type: GraphQLString },
        layout: { type: new GraphQLList(GraphQLJSONObject) },
        draftLayout: { type: new GraphQLList(GraphQLJSONObject) },
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
