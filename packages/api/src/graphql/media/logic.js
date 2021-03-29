/**
 * Bussiness logic for managing media.
 */
const Media = require("../../models/Media.js");
const {
  makeModelTextSearchable,
  checkPermission,
  validateOffset,
  getMediaOrThrow,
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
    domain: ctx.domain._id,
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
  const media = await getMediaOrThrow(mediaData.id, ctx);

  for (const key of Object.keys(mediaData)) {
    media[key] = mediaData[key];
  }

  if (!media.title) {
    throw new Error(strings.responses.title_is_required);
  }

  return await media.save();
};
