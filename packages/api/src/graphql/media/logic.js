/**
 * Bussiness logic for managing media.
 */
const Media = require("../../models/Media.js");
const {
  makeModelTextSearchable,
  checkPermission,
  validateOffset,
  getMediaOrThrow,
  mapFileNamesToCompleteURLs,
} = require("../../lib/graphql.js");
const { itemsPerPage, permissions } = require("../../config/constants.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");

exports.getCreatorMedia = async (offset, ctx, text) => {
  checkIfAuthenticated(ctx);
  validateOffset(offset);
  const user = ctx.user;

  if (
    !checkPermission(user.permissions, [
      permissions.viewAnyMedia,
      permissions.manageMedia,
      permissions.manageAnyMedia,
    ])
  ) {
    throw new Error(strings.responses.action_not_allowed);
  }

  const query = {
    domain: ctx.subdomain._id,
  };
  if (
    !checkPermission(user.permissions, [
      permissions.manageAnyMedia,
      permissions.viewAnyMedia,
    ])
  ) {
    query.creatorId = ctx.user._id;
  }

  if (text) query.$text = { $search: text };
  const searchMedia = makeModelTextSearchable(Media);

  const resultSet = await searchMedia(
    { offset, query, graphQLContext: ctx },
    {
      itemsPerPage,
      sortByColumn: "_id",
      sortOrder: -1,
    }
  );

  return mapFileNamesToCompleteURLs(resultSet);
};

exports.updateMedia = async (mediaData, ctx) => {
  const media = await getMediaOrThrow(mediaData.id, ctx);

  for (const key of Object.keys(mediaData)) {
    media[key] = mediaData[key];
  }

  return await media.save();
};
