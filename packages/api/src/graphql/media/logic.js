/**
 * Bussiness logic for managing media
 */
const Media = require("../../models/Media.js");
const { makeModelTextSearchable } = require("../../lib/graphql.js");
const { itemsPerPage } = require("../../config/constants.js");
const {
  checkIfAuthenticated,
  checkOwnership,
} = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");

const checkMediaOwnership = checkOwnership(Media);

exports.getCreatorMedia = async (offset, ctx, text) => {
  const query = {
    creatorId: ctx && ctx.user && ctx.user._id,
  };
  if (text) query.$text = { $search: text };

  const searchMedia = makeModelTextSearchable(Media);

  return searchMedia(
    { offset, query, graphQLContext: ctx },
    {
      itemsPerPage,
      sortByColumn: "_id",
      sortOrder: -1,
    }
  );
};

exports.updateMedia = async (mediaData, ctx) => {
  checkIfAuthenticated(ctx);
  let media = await checkMediaOwnership(mediaData.id, ctx);

  for (const key of Object.keys(mediaData)) {
    media[key] = mediaData[key];
  }

  if (!media.title) {
    throw new Error(strings.responses.title_is_required);
  }

  media = await media.save();
  return media;
};
