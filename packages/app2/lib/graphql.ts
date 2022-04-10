import { EditorState, convertFromRaw } from "draft-js";
import { decode } from "base-64";
import { responses } from "../config/strings";
import constants from "../config/constants";
import mongoose from "mongoose";
import type GQLContext from "../models/GQLContext";
import type Media from "../models/Media";
import HttpError from "../models/HttpError";
import { generateSignedUrl } from "../lib/s3-utils";
const { cdnEndpoint } = constants;

export const checkIfAuthenticated = (ctx: GQLContext) => {
  if (!ctx.user) throw new Error(responses.request_not_authenticated);
};

const ObjectId = mongoose.Types.ObjectId;

export const checkOwnership = (Model: any) => async (
  id: string,
  ctx: GQLContext
) => {
  const item = await Model.findOne({ _id: id, domain: ctx.subdomain._id });
  if (
    !item ||
    (ObjectId.isValid(item.creatorId)
      ? item.creatorId.toString() !== ctx.user._id.toString()
      : item.creatorId.toString() !== ctx.user.userId.toString())
  ) {
    throw new Error(responses.item_not_found);
  }

  return item;
};

export const checkOwnershipWithoutModel = (item: any, ctx: GQLContext) => {
  if (
    !item ||
    (ObjectId.isValid(item.creatorId)
      ? item.creatorId.toString() !== ctx.user._id.toString()
      : item.creatorId.toString() !== ctx.user.userId.toString())
  ) {
    return false;
  }

  return true;
};

export const validateOffset = (offset: number) => {
  if (offset < 1) throw new Error(responses.invalid_offset);
};

export const extractPlainTextFromDraftJS = (
  encodedEditorStateString: string,
  characters: number
) => {
  try {
    const editorState = EditorState.createWithContent(
      convertFromRaw(JSON.parse(decode(encodedEditorStateString)))
    );
    const descriptInPlainText = editorState.getCurrentContent().getPlainText();
    return descriptInPlainText.length > characters
      ? descriptInPlainText.substring(0, characters) + "..."
      : descriptInPlainText;
  } catch (err) {
    return "";
  }
};

// export const checkAdminOrSelf = (userID, GraphQLContext) => {
//   const isSelf = userID === GraphQLContext.user.id;
//   const isAdmin = GraphQLContext.user.isAdmin;
//   const isActionAllowed = isSelf || isAdmin;
//   if (!isActionAllowed) {
//     throw new Error(strings.responses.action_not_allowed);
//   }
// };

// // export const checkIfItemExists = async (Model, id) => {
// //   const item = await Model.findById(id);
// //   if (!item) throw new Error(strings.responses.item_not_found);

// //   return item;
// // };

const validateMongooseTextSearchQuery = (query: any) => {
  if (typeof query !== "object") {
    throw new Error(responses.invalid_input);
  }
};

interface SearchData {
  offset: number;
  query: Record<string, unknown>;
  graphQLContext: GQLContext;
}
interface SearchOptions {
  checkIfRequestIsAuthenticated?: boolean;
  itemsPerPage?: number;
  sortByColumn?: string;
  sortOrder?: 1 | -1;
}
export const makeModelTextSearchable = (Model: any) => async (
  searchData: SearchData,
  options: SearchOptions = {}
) => {
  const itemsPerPage = options.itemsPerPage || constants.itemsPerPage;
  const checkIfRequestIsAuthenticated =
    options.checkIfRequestIsAuthenticated || true;
  const offset = (searchData.offset || constants.defaultOffset) - 1;

  validateSearchInput(searchData, checkIfRequestIsAuthenticated);

  const query = Model.find(searchData.query)
    .skip(offset * itemsPerPage)
    .limit(itemsPerPage);
  if (options.sortByColumn && options.sortOrder) {
    query.sort({ [options.sortByColumn]: options.sortOrder });
  }

  return query;
};

const validateSearchInput = (
  searchData: SearchData,
  checkIfRequestIsAuthenticated: boolean
) => {
  validateOffset(searchData.offset);
  validateMongooseTextSearchQuery(searchData.query);
  if (checkIfRequestIsAuthenticated) {
    checkIfAuthenticated(searchData.graphQLContext);
  }
};

export const checkPermission = (
  actualPermissions: string[],
  desiredPermissions: string[]
) =>
  actualPermissions.some((permission) =>
    desiredPermissions.includes(permission)
  );

export const getMediaOrThrow = async (
  id: mongoose.Types.ObjectId,
  ctx: GQLContext
) => {
  checkIfAuthenticated(ctx);

  //   const media: Media | null = await MediaModel.findOne({
  //     _id: id,
  //     domain: ctx.subdomain._id,
  //   });

  //   if (!media) {
  //     throw new HttpError(responses.item_not_found, 404);
  //   }

  //   if (
  //     !checkPermission(ctx.user.permissions, [
  //       constants.permissions.manageAnyMedia,
  //     ])
  //   ) {
  //     if (!checkOwnershipWithoutModel(media, ctx)) {
  //       throw new HttpError(responses.item_not_found, 403);
  //     } else {
  //       if (
  //         !checkPermission(ctx.user.permissions, [
  //           constants.permissions.manageMedia,
  //         ])
  //       ) {
  //         throw new HttpError(responses.action_not_allowed, 403);
  //       }
  //     }
  //   }

  return media;
};

export const mapRelativeURLsToFullURLs = (media: Media) => {
  return {
    id: media.id,
    file: media.public
      ? `${cdnEndpoint}/${media.file}`
      : generateSignedUrl({ name: media.file }),
    thumbnail: media.thumbnail ? `${cdnEndpoint}/${media.thumbnail}` : "",
    originalFileName: media.originalFileName,
    mimeType: media.mimeType,
    size: media.size,
    caption: media.caption,
    public: media.public,
    key: media.file,
  };
};
