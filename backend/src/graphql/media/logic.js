/**
 * Bussiness logic for managing media
 */
const Media = require("../../models/Media.js");
const { makeModelTextSearchable } = require("../../lib/graphql.js");
const { mymediaLimit } = require("../../config/constants.js");

exports.getCreatorMedia = async (offset, ctx, text) => {
  const query = {
    creatorId: ctx && ctx.user && ctx.user._id
  };
  if (text) query.$text = { $search: text };

  const searchMedia = makeModelTextSearchable(Media);

  return searchMedia(
    { offset, query, graphQLContext: ctx },
    {
      itemsPerPage: mymediaLimit,
      sortByColumn: "_id",
      sortOrder: -1
    }
  );
};
