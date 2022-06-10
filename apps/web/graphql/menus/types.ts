import {
    GraphQLNonNull,
    GraphQLID,
    GraphQLString,
    GraphQLBoolean,
    GraphQLInputObjectType,
    GraphQLObjectType,
} from "graphql";

const publicLinkType = new GraphQLObjectType({
    name: "PublicLink",
    fields: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        destination: { type: new GraphQLNonNull(GraphQLString) },
        category: { type: new GraphQLNonNull(GraphQLString) },
        newTab: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const linkType = new GraphQLObjectType({
    name: "Link",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        text: { type: new GraphQLNonNull(GraphQLString) },
        destination: { type: new GraphQLNonNull(GraphQLString) },
        category: { type: new GraphQLNonNull(GraphQLString) },
        newTab: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const linkInputType = new GraphQLInputObjectType({
    name: "LinkInput",
    fields: {
        id: { type: GraphQLID },
        text: { type: new GraphQLNonNull(GraphQLString) },
        destination: { type: new GraphQLNonNull(GraphQLString) },
        category: { type: new GraphQLNonNull(GraphQLString) },
        newTab: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

export default {
    publicLinkType,
    linkType,
    linkInputType,
};
