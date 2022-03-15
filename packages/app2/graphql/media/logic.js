/**
 * Bussiness logic for managing media.
 */
const Media = require("../../models/Media");
const {
  makeModelTextSearchable,
  checkPermission,
  validateOffset,
  getMediaOrThrow,
  mapRelativeURLsToFullURLs,
  checkIfAuthenticated
} = require("../../lib/graphql");
const { itemsPerPage, permissions } = require("../../config/constants");
const strings = require("../../config/strings");
// const { putObjectAclPromise } = require("../../routes/media/utils.js");

exports.getMedia = async (mediaId, ctx) => {
  let media = null;

  if (mediaId) {
    media = await Media.findOne({
      _id: mediaId,
      domain: ctx.subdomain._id,
    });
    media = mapRelativeURLsToFullURLs(media);
  }

  return media;
};

exports.getCreatorMedia = async (offset, ctx, text, mimeType, privacy) => {
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
  if (mimeType) query.mimeType = { $in: mimeType };
  if (privacy) query.public = privacy;
  const searchMedia = makeModelTextSearchable(Media);

  const resultSet = await searchMedia(
    { offset, query, graphQLContext: ctx },
    {
      itemsPerPage,
      sortByColumn: "updatedAt",
      sortOrder: -1,
    }
  );

  return resultSet.map(mapRelativeURLsToFullURLs);
};

exports.updateMedia = async (mediaData, ctx) => {
  // let media = await getMediaOrThrow(mediaData.id, ctx);

  // if (mediaData.public !== media.public) {
  //   await putObjectAclPromise({
  //     Key: media.file,
  //     ACL: mediaData.public === "true" ? "public-read" : "private",
  //   });
  // }

  // for (const key of Object.keys(mediaData)) {
  //   media[key] = mediaData[key];
  // }

  // media = await media.save();
  // return mapRelativeURLsToFullURLs(media);
};

exports.checkMediaForPublicAccess = async (mediaId, ctx) => {
  const media = await this.getMedia(mediaId, ctx);

  if (media && media.public) {
    return true;
  }

  return false;
};
