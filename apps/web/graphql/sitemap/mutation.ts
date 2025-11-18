import { GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { updateSitemap } from './logic';
import types from './types';

const mutations = {
  updateSitemap: {
    type: types.Sitemap,
    args: {
      domain: { type: new GraphQLNonNull(GraphQLString) },
      items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(types.SitemapItemInput))) },
      publishLatestBlogs: { type: GraphQLBoolean },
    },
    resolve: (
      _: any,
      {
        domain,
        items,
        publishLatestBlogs,
      }: { domain: string; items: any[]; publishLatestBlogs: boolean }
    ) => updateSitemap(domain, items, publishLatestBlogs),
  },
};

export default mutations;
