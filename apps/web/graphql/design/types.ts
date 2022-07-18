import {
    GraphQLNonNull,
    GraphQLString,
    GraphQLBoolean,
    GraphQLObjectType,
    GraphQLInputObjectType,
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

export default {
    themeType,
    themeInputType,
};
