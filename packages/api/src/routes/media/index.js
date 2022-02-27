"use strict";

/**
 * An end point for managing file uploads.
 */
const express = require("express");
const Media = require("../../models/Media.js");
const responses = require("../../config/strings").responses;
const constants = require("../../config/constants.js");
const manageOnCloud = require("./manage-on-cloud");

const { maxFileUploadSize } = require("../../config/constants.js");
const { checkPermission, getMediaOrThrow } = require("../../lib/graphql.js");

const getHandler = async (req, res) => {
  let media;

  try {
    media = await Media.findOne({
      _id: req.params.mediaId,
      domain: req.subdomain._id,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  if (!media) {
    return res.status(404).json({ message: responses.item_not_found });
  }

  await manageOnCloud.serve({ media, res });
};

const postHandler = async (req, res) => {
  req.socket.setTimeout(10 * 60 * 1000);

  if (
    !checkPermission(req.user.permissions, [constants.permissions.uploadMedia])
  ) {
    return res.status(400).json({ message: responses.action_not_allowed });
  }

  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: responses.file_is_required });
  }

  if (req.files.file.size > maxFileUploadSize) {
    return res.status(400).json({ message: responses.file_size_exceeded });
  }

  await manageOnCloud.upload(req, res);
};

const deleteHandler = async (req, res) => {
  let media;

  try {
    media = await getMediaOrThrow(req.params.mediaId, req);
  } catch (err) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  await manageOnCloud.delete(media, res);
};

module.exports = (passport) => {
  const router = express.Router();
  router.get("/:mediaId", getHandler);
  router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    postHandler
  );
  router.delete(
    "/:mediaId",
    passport.authenticate("jwt", { session: false }),
    deleteHandler
  );
  return router;
};
