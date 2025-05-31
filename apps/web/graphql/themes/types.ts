import {
    GraphQLNonNull,
    GraphQLString,
    GraphQLObjectType,
    GraphQLList,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";

const themeStyleType = new GraphQLObjectType({
    name: "ThemeStyle",
    fields: {
        colors: { type: GraphQLJSONObject },
        typography: { type: GraphQLJSONObject },
        interactives: { type: GraphQLJSONObject },
        structure: { type: GraphQLJSONObject },
    },
});

const themeType = new GraphQLObjectType({
    name: "Theme",
    fields: {
        themeId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        theme: { type: themeStyleType },
        draftTheme: { type: themeStyleType },
    },
});

const themesType = new GraphQLObjectType({
    name: "Themes",
    fields: {
        system: { type: new GraphQLList(themeType) },
        custom: { type: new GraphQLList(themeType) },
    },
});

export default {
    themeType,
    themesType,
};
