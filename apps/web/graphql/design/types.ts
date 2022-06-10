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
        top: { type: new GraphQLList(GraphQLString) },
        bottom: { type: new GraphQLList(GraphQLString) },
        aside: { type: new GraphQLList(GraphQLString) },
        footerLeft: { type: new GraphQLList(GraphQLString) },
        footerRight: { type: new GraphQLList(GraphQLString) },
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
