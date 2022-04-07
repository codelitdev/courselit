import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

const mediaType = new GraphQLObjectType({
  name: "Media",
  fields: {
    id: { type: GraphQLID },
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

const mediaUpdateType = new GraphQLInputObjectType({
  name: "MediaUpdateInput",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    caption: { type: GraphQLString },
    public: { type: GraphQLString },
  },
});

export default {
  mediaType,
  mediaUpdateType,
};
