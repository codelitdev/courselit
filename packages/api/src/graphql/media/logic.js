/**
 * Bussiness logic for managing media.
 */
const Media = require("../../models/Media.js");
const {
  makeModelTextSearchable,
  checkPermission,
  validateOffset,
  getMediaOrThrow,
  mapRelativeURLsToFullURLs,
} = require("../../lib/graphql.js");
const { itemsPerPage, permissions } = require("../../config/constants.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");
const { putObjectAclPromise } = require("../../routes/media/utils.js");

exports.getLessonMedia = async (lesson, ctx) => {
  let media = null;

  if (lesson.mediaId) {
    media = await Media.findOne({
      _id: lesson.mediaId,
      domain: ctx.subdomain._id,
    });
    media = mapRelativeURLsToFullURLs(media);
  }

  return media;
};

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
      sortByColumn: "updatedAt",
      sortOrder: -1,
    }
  );

  return resultSet.map(mapRelativeURLsToFullURLs);
};

exports.updateMedia = async (mediaData, ctx) => {
  let media = await getMediaOrThrow(mediaData.id, ctx);

  if (mediaData.public !== media.public) {
    await putObjectAclPromise({
      Key: media.file,
      ACL: mediaData.public === "true" ? "public-read" : "private",
    });
  }

  for (const key of Object.keys(mediaData)) {
    media[key] = mediaData[key];
  }

  media = await media.save();
  return mapRelativeURLsToFullURLs(media);
};
