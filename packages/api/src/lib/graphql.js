const { EditorState, convertFromRaw } = require("draft-js");
const { decode } = require("base-64");
const strings = require("../config/strings.js");
const constants = require("../config/constants.js");
const ObjectId = require("mongoose").Types.ObjectId;
const Media = require("../models/Media.js");
const HttpError = require("./HttpError.js");
const { cdnEndpoint } = require("../config/constants.js");

exports.checkIfAuthenticated = (ctx) => {
  if (!ctx.user) throw new Error(strings.responses.request_not_authenticated);
};

/**
 * Helper function for checking the ownership of the item based on creatorId field.
 *
 * @param {Object} Model Mongoose Schema
 * @param {ObjectId} id MongoDB ObjectId for the item
 * @param {Object} ctx context received from the GraphQL resolver
 */
exports.checkOwnership = (Model) => async (id, ctx) => {
  const item = await Model.findOne({ _id: id, domain: ctx.subdomain._id });
  if (
    !item ||
    (ObjectId.isValid(item.creatorId)
      ? item.creatorId.toString() !== ctx.user._id.toString()
      : item.creatorId.toString() !== ctx.user.userId.toString())
  ) {
    throw new Error(strings.responses.item_not_found);
  }

  return item;
};

exports.checkOwnershipWithoutModel = (item, ctx) => {
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

exports.validateOffset = (offset) => {
  if (offset < 1) throw new Error(strings.responses.invalid_offset);
};

exports.extractPlainTextFromDraftJS = (
  encodedEditorStateString,
  characters
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

exports.checkAdminOrSelf = (userID, GraphQLContext) => {
  const isSelf = userID === GraphQLContext.user.id;
  const isAdmin = GraphQLContext.user.isAdmin;
  const isActionAllowed = isSelf || isAdmin;
  if (!isActionAllowed) {
    throw new Error(strings.responses.action_not_allowed);
  }
};

// exports.checkIfItemExists = async (Model, id) => {
//   const item = await Model.findById(id);
//   if (!item) throw new Error(strings.responses.item_not_found);

//   return item;
// };

const validateMongooseTextSearchQuery = (query) => {
  if (typeof query !== "object") {
    throw new Error(strings.responses.invalid_input);
  }
};

/**
 * searchData = {
 *  offset: number,
 *  query: object,
 *  graphQLContext: object
 * }
 *
 * options = {
 *  checkIfRequestIsAuthenticated: boolean,
 *  itemsPerPage: number
 * }
 */
exports.makeModelTextSearchable = (Model) => async (
  searchData,
  options = {}
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

const validateSearchInput = (searchData, checkIfRequestIsAuthenticated) => {
  this.validateOffset(searchData.offset);
  validateMongooseTextSearchQuery(searchData.query);
  if (checkIfRequestIsAuthenticated) {
    this.checkIfAuthenticated(searchData.graphQLContext);
  }
};

exports.checkPermission = (actualPermissions, desiredPermissions) =>
  actualPermissions.some((permission) =>
    desiredPermissions.includes(permission)
  );

exports.getMediaOrThrow = async (id, ctx) => {
  this.checkIfAuthenticated(ctx);

  const media = await Media.findOne({ _id: id, domain: ctx.subdomain._id });

  if (!media) {
    throw new HttpError(strings.responses.item_not_found, 404);
  }

  if (
    !this.checkPermission(ctx.user.permissions, [
      constants.permissions.manageAnyMedia,
    ])
  ) {
    if (!this.checkOwnershipWithoutModel(media, ctx)) {
      throw new HttpError(strings.responses.item_not_found, 403);
    } else {
      if (
        !this.checkPermission(ctx.user.permissions, [
          constants.permissions.manageMedia,
        ])
      ) {
        throw new HttpError(strings.responses.action_not_allowed, 403);
      }
    }
  }

  return media;
};

exports.mapFileNamesToCompleteURLs = (mediaItems) => {
  const mediaWithCompleteUrls = [];
  for (const media of mediaItems) {
    mediaWithCompleteUrls.push({
      id: media.id,
      file: `${cdnEndpoint}/${media.file}`,
      thumbnail: media.thumbnail ? `${cdnEndpoint}/${media.thumbnail}` : "",
      originalFileName: media.originalFileName,
      mimeType: media.mimeType,
      size: media.size,
      altText: media.altText,
    });
  }
  return mediaWithCompleteUrls;
};
