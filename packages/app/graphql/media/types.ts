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
    mediaId: { type: new GraphQLNonNull(GraphQLString) },
    file: { type: new GraphQLNonNull(GraphQLString) },
    thumbnail: { type: GraphQLString },
    originalFileName: {
      type: new GraphQLNonNull(GraphQLString),
    },
    mimeType: { type: new GraphQLNonNull(GraphQLString) },
    size: { type: new GraphQLNonNull(GraphQLInt) },
    caption: { type: GraphQLString },
    public: { type: new GraphQLNonNull(GraphQLBoolean) },
    key: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export default {
  mediaType,
};
