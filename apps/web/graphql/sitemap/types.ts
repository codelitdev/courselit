import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';

const SitemapItem = new GraphQLObjectType({
  name: 'SitemapItem',
  fields: {
    loc: { type: new GraphQLNonNull(GraphQLString) },
    lastmod: { type: GraphQLString },
  },
});

const Sitemap = new GraphQLObjectType({
  name: 'Sitemap',
  fields: {
    _id: { type: new GraphQLNonNull(GraphQLString) },
    domain: { type: new GraphQLNonNull(GraphQLString) },
    items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SitemapItem))) },
    publishLatestBlogs: { type: GraphQLBoolean },
  },
});

const SitemapItemInput = new GraphQLInputObjectType({
  name: 'SitemapItemInput',
  fields: {
    loc: { type: new GraphQLNonNull(GraphQLString) },
    lastmod: { type: GraphQLString },
  },
});

export default {
  Sitemap,
  SitemapItemInput,
};
