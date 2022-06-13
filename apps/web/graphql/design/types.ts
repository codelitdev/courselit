import {
    GraphQLNonNull,
    GraphQLString,
    GraphQLBoolean,
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLList,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";

const themeType = new GraphQLObjectType({
    name: "Theme",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        active: { type: new GraphQLNonNull(GraphQLBoolean) },
        styles: { type: new GraphQLNonNull(GraphQLJSONObject) },
        url: { type: GraphQLString },
    },
});

const themeInputType = new GraphQLInputObjectType({
    name: "ThemeInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        styles: { type: new GraphQLNonNull(GraphQLString) },
        url: { type: GraphQLString },
    },
});

const layoutType = new GraphQLObjectType({
    name: "Layout",
    fields: {
        top: { type: new GraphQLList(GraphQLJSONObject) },
        bottom: { type: new GraphQLList(GraphQLJSONObject) },
        aside: { type: new GraphQLList(GraphQLJSONObject) },
        footerLeft: { type: new GraphQLList(GraphQLJSONObject) },
        footerRight: { type: new GraphQLList(GraphQLJSONObject) },
    },
});

const layoutInputType = new GraphQLInputObjectType({
    name: "LayoutInput",
    fields: {
        layout: { type: new GraphQLNonNull(GraphQLString) },
    },
});

export default {
    themeType,
    themeInputType,
    layoutType,
    layoutInputType,
};
