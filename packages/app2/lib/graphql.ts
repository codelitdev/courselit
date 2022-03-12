// const { EditorState, convertFromRaw } = require("draft-js");
// const { decode } = require("base-64");
import { responses } from "../config/strings";
import constants from "../config/constants";
// const constants = require("../config/constants.js");
import mongoose from "mongoose";
// const Media = require("../models/Media.js");
// const HttpError = require("./HttpError.js");
// const { cdnEndpoint } = require("../config/constants.js");
// const { generateSignedUrl } = require("../routes/media/utils.js");

export const checkIfAuthenticated = (ctx: Record<string, unknown>) => {
  if (!ctx.user) throw new Error(responses.request_not_authenticated);
};

const ObjectId = mongoose.Types.ObjectId;

export const checkOwnership =
  (Model: any) => async (id: string, ctx: Record<string, unknown>) => {
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

// export const checkOwnershipWithoutModel = (item, ctx) => {
//   if (
//     !item ||
//     (ObjectId.isValid(item.creatorId)
//       ? item.creatorId.toString() !== ctx.user._id.toString()
//       : item.creatorId.toString() !== ctx.user.userId.toString())
//   ) {
//     return false;
//   }

//   return true;
// };

export const validateOffset = (offset: number) => {
  if (offset < 1) throw new Error(responses.invalid_offset);
};

// export const extractPlainTextFromDraftJS = (
//   encodedEditorStateString,
//   characters
// ) => {
//   try {
//     const editorState = EditorState.createWithContent(
//       convertFromRaw(JSON.parse(decode(encodedEditorStateString)))
//     );
//     const descriptInPlainText = editorState.getCurrentContent().getPlainText();
//     return descriptInPlainText.length > characters
//       ? descriptInPlainText.substring(0, characters) + "..."
//       : descriptInPlainText;
//   } catch (err) {
//     return "";
//   }
// };

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
  graphQLContext: Record<string, unknown>;
}
interface SearchOptions {
  checkIfRequestIsAuthenticated?: boolean;
  itemsPerPage?: number;
  sortByColumn?: string;
  sortOrder?: 1 | -1;
}
export const makeModelTextSearchable =
  (Model: any) =>
  async (searchData: SearchData, options: SearchOptions = {}) => {
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

// export const checkPermission = (actualPermissions, desiredPermissions) =>
//   actualPermissions.some((permission) =>
//     desiredPermissions.includes(permission)
//   );

// export const getMediaOrThrow = async (id, ctx) => {
//   this.checkIfAuthenticated(ctx);

//   const media = await Media.findOne({ _id: id, domain: ctx.subdomain._id });

//   if (!media) {
//     throw new HttpError(strings.responses.item_not_found, 404);
//   }

//   if (
//     !this.checkPermission(ctx.user.permissions, [
//       constants.permissions.manageAnyMedia,
//     ])
//   ) {
//     if (!this.checkOwnershipWithoutModel(media, ctx)) {
//       throw new HttpError(strings.responses.item_not_found, 403);
//     } else {
//       if (
//         !this.checkPermission(ctx.user.permissions, [
//           constants.permissions.manageMedia,
//         ])
//       ) {
//         throw new HttpError(strings.responses.action_not_allowed, 403);
//       }
//     }
//   }

//   return media;
// };

// export const mapRelativeURLsToFullURLs = (media) => {
//   return {
//     id: media.id,
//     file: media.public
//       ? `${cdnEndpoint}/${media.file}`
//       : generateSignedUrl({ name: media.file }),
//     thumbnail: media.thumbnail ? `${cdnEndpoint}/${media.thumbnail}` : "",
//     originalFileName: media.originalFileName,
//     mimeType: media.mimeType,
//     size: media.size,
//     caption: media.caption,
//     public: media.public,
//     key: media.file,
//   };
// };
