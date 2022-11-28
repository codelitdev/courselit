import {
    GraphQLString,
    GraphQLInt,
    GraphQLObjectType,
    GraphQLInputObjectType,
} from "graphql";

const mediaType = new GraphQLObjectType({
    name: "Media",
    fields: {
        mediaId: { type: GraphQLString },
        originalFileName: { type: GraphQLString },
        mimeType: { type: GraphQLString },
        size: { type: GraphQLInt },
        access: { type: GraphQLString },
        file: { type: GraphQLString },
        thumbnail: { type: GraphQLString },
        caption: { type: GraphQLString },
    },
});

const mediaInputType = new GraphQLInputObjectType({
    name: "MediaInput",
    fields: {
        mediaId: { type: GraphQLString },
        originalFileName: { type: GraphQLString },
        mimeType: { type: GraphQLString },
        size: { type: GraphQLInt },
        access: { type: GraphQLString },
        file: { type: GraphQLString },
        thumbnail: { type: GraphQLString },
        caption: { type: GraphQLString },
    },
});

export default {
    mediaType,
    mediaInputType,
};
