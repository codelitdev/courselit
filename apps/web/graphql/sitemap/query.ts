import { GraphQLString, GraphQLNonNull } from 'graphql';
import { getSitemap } from './logic';
import types from './types';

const queries = {
  sitemap: {
    type: types.Sitemap,
    args: {
      domain: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve: (_: any, { domain }: { domain: string }) => getSitemap(domain),
  },
};

export default queries;
