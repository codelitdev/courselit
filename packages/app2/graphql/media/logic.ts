/**
 * Bussiness logic for managing media.
 */
import {
  makeModelTextSearchable,
  checkPermission,
  validateOffset,
  getMediaOrThrow,
  mapRelativeURLsToFullURLs,
  checkIfAuthenticated
} from "../../lib/graphql";
import { responses } from '../../config/strings';
import constants from '../../config/constants';
import GQLContext from '../../models/GQLContext';
import { putObjectAclPromise } from '../../lib/s3-utils';
import Media from '../../models/Media';
const { itemsPerPage, permissions } = constants;

export const getMedia = async (mediaId: string, ctx: GQLContext) => {
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

export const getCreatorMedia = async (
  offset: number,
  ctx: GQLContext,
  text: string,
  mimeType: string,
  privacy: boolean
) => {
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
    throw new Error(responses.action_not_allowed);
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

export const updateMedia = async (mediaData: any, ctx: GQLContext) => {
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

export const checkMediaForPublicAccess = async (mediaId: string, ctx: GQLContext) => {
  const media = await getMedia(mediaId, ctx);

  if (media && media.public) {
    return true;
  }

  return false;
};
