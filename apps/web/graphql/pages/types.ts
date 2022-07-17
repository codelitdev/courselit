import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import constants from "../../config/constants";
const { product, site, landing } = constants;

const pageType = new GraphQLEnumType({
    name: "PageType",
    values: {
        PRODUCT: { value: product },
        SITE: { value: site },
        LANDING: { value: landing },
    },
});

const page = new GraphQLObjectType({
    name: "Page",
    fields: {
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(pageType) },
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
