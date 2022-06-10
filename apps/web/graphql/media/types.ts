import {
    GraphQLID,
    GraphQLNonNull,
    GraphQLString,
    GraphQLInt,
    GraphQLObjectType,
    GraphQLBoolean,
} from "graphql";

const mediaType = new GraphQLObjectType({
    name: "Media",
    fields: {
        mediaId: { type: GraphQLString },
        file: { type: GraphQLString },
        thumbnail: { type: GraphQLString },
        originalFileName: { type: GraphQLString },
        mimeType: { type: GraphQLString },
        size: { type: GraphQLInt },
        caption: { type: GraphQLString },
        public: { type: GraphQLBoolean },
        key: { type: GraphQLString },
    },
});

export default {
    mediaType,
};
