"use strict";

/**
 * An end point for managing file uploads.
 */
const express = require("express");
const fs = require("fs");
const Media = require("../../models/Media.js");
const responses = require("../../config/strings").responses;
const constants = require("../../config/constants.js");
const manageOnDisk = require("./manage-on-disk");
const manageOnCloud = require("./manage-on-cloud");
const { generateFolderPaths } = require("./utils");

const {
  uploadFolder,
  useWebp,
  useCloudStorage,
  maxFileUploadSize
} = require("../../config/constants.js");
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

  const { uploadFolderForDomain, thumbFolderForDomain } = generateFolderPaths({
    uploadFolder,
    domainName: req.subdomain.name,
  });
  const { thumb } = req.query;

  if (thumb === "1") {
    if (media.thumbnail) {
      res.contentType(useWebp ? "image/webp" : "image/jpeg");
      res.sendFile(`${thumbFolderForDomain}/${media.thumbnail}`);
    } else {
      res.status(200).json({ message: responses.no_thumbnail });
    }
  } else {
    res.contentType(media.mimeType);
    res.sendFile(`${uploadFolderForDomain}/${media.fileName}`);
  }
};

const postHandler = async (req, res) => {
  if (
    !checkPermission(req.user.permissions, [constants.permissions.uploadMedia])
  ) {
    return res.status(400).json({ message: responses.action_not_allowed });
  }

  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: responses.file_is_required });
  }

  if (req.files.file.size > maxFileUploadSize) {
    return res.status(400).json({ message: responses.file_size_exceeded })
  }

  if (useCloudStorage) {
    await manageOnCloud.upload(req, res);
  } else {
    await manageOnDisk.upload(req, res);
  }
};

const getSignedUrlForCloudUpload = async (req, res) => {
  if (
    !checkPermission(req.user.permissions, [constants.permissions.uploadMedia])
  ) {
    return res.status(400).json({ message: responses.action_not_allowed });
  }

  const data = req.body;
  if (!data.name) {
    return res.status(400).json({ message: responses.title_is_required });
  }
  if (!data.mimetype) {
    return res.status(400).json({ message: responses.title_is_required });
  }

  try {
    const url = await manageOnCloud.generateSignedUrl(data);
    return res.status(200).json({ url })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

const deleteHandler = async (req, res) => {
  let media;

  try {
    media = await getMediaOrThrow(req.params.mediaId, req);
  } catch (err) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  const { uploadFolderForDomain, thumbFolderForDomain } = generateFolderPaths({
    uploadFolder,
    domainName: req.subdomain.name,
  });

  try {
    if (media.thumbnail) {
      fs.unlinkSync(`${thumbFolderForDomain}/${media.thumbnail}`);
    }
    fs.unlinkSync(`${uploadFolderForDomain}/${media.fileName}`);
    await Media.deleteOne({ _id: media.id });

    return res.status(200).json({ message: responses.success });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
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
  router.post(
    "/clouduploadurl",
    passport.authenticate("jwt", { session: false }),
    getSignedUrlForCloudUpload
  );
  return router;
};
