"use strict";

/**
 * An end point for managing file uploads.
 */
const express = require("express");
const Media = require("../models/Media.js");
const responses = require("../config/strings").responses;
const constants = require("../config/constants.js");
const thumbnail = require("@courselit/thumbnail");
const path = require("path");
const fs = require("fs");
const {
  foldersExist,
  uniqueFileNameGenerator,
  moveFile,
  convertToWebp,
} = require("../lib/utils.js");
const {
  uploadFolder,
  thumbnailsFolder,
  webpOutputQuality,
  useWebp,
} = require("../config/constants.js");

const getHandler = async (req, res) => {
  const media = await Media.findOne({
    _id: req.params.mediaId,
    domain: req.domain._id,
  });

  const { thumb } = req.query;

  if (thumb === "1") {
    if (media.thumbnail) {
      res.contentType(useWebp ? "image/webp" : "image/jpeg");
      res.sendFile(`${constants.thumbnailsFolder}/${media.thumbnail}`);
    } else {
      res.status(200).json({ message: responses.no_thumbnail });
    }
  } else {
    res.contentType(media.mimeType);
    res.sendFile(`${constants.uploadFolder}/${media.fileName}`);
  }
};

const postHandler = async (req, res) => {
  if (!req.user.isCreator) {
    return res.status(400).json({ message: responses.not_a_creator });
  }
  const data = req.body;
  if (!data.title) {
    return res.status(400).json({ message: responses.title_is_required });
  }
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: responses.file_is_required });
  }

  const thumbnailExtension = useWebp ? "webp" : "jpg";

  // check if destination folders exists
  if (!foldersExist([uploadFolder, thumbnailsFolder])) {
    return res.status(500).json({ message: responses.destination_dont_exist });
  }

  const imagePattern = /image/;
  const videoPattern = /video/;

  // create unique file name for the uploaded file
  const fileName = uniqueFileNameGenerator(req.files.file.name);
  const filePath = path.join(
    constants.uploadFolder,
    `${fileName.name}.${
      useWebp && imagePattern.test(req.files.file.mimetype)
        ? "webp"
        : fileName.ext
    }`
  );

  // move the uploaded file to the upload folder
  try {
    await moveFile(req.files.file, filePath);
    if (useWebp && imagePattern.test(req.files.file.mimetype)) {
      await convertToWebp(filePath, webpOutputQuality);
    }
  } catch (err) {
    return res.status(500).json({ message: responses.error_in_moving_file });
  }

  // generate thumbnail for a video or image
  const thumbPath = `${constants.thumbnailsFolder}/${fileName.name}.${thumbnailExtension}`;
  let isThumbGenerated = false; // to indicate if the thumbnail name is to be saved to the DB
  try {
    if (imagePattern.test(req.files.file.mimetype)) {
      await thumbnail.forImage(filePath, thumbPath, {
        width: constants.thumbnailWidth,
      });
      if (useWebp) {
        await convertToWebp(thumbPath);
      }
      isThumbGenerated = true;
    }
    if (videoPattern.test(req.files.file.mimetype)) {
      await thumbnail.forVideo(filePath, thumbPath, {
        width: constants.thumbnailWidth,
        height: constants.thumbnailHeight,
      });
      if (useWebp) {
        await convertToWebp(thumbPath);
      }
      isThumbGenerated = true;
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  const mediaObject = {
    domain: req.domain._id,
    title: data.title,
    originalFileName: req.files.file.name,
    fileName: `${fileName.name}.${
      useWebp && imagePattern.test(req.files.file.mimetype)
        ? "webp"
        : fileName.ext
    }`,
    creatorId: req.user._id,
    mimeType:
      useWebp && imagePattern.test(req.files.file.mimetype)
        ? "image/webp"
        : req.files.file.mimetype,
    size: req.files.file.size,
  };
  if (isThumbGenerated) {
    mediaObject.thumbnail = `${fileName.name}.${thumbnailExtension}`;
  }
  if (data.altText) mediaObject.altText = data.altText;

  try {
    const media = await Media.create(mediaObject);
    return res.status(200).json({
      message: responses.success,
      media: {
        id: media.id,
        title: mediaObject.title,
        mimeType: mediaObject.mimeType,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteHandler = async (req, res) => {
  const media = await Media.findOne({
    _id: req.params.mediaId,
    domain: req.domain._id,
  });

  if (!isOwner(media, req.user)) {
    return res.status(404).json({ message: responses.item_not_found });
  }

  const file = `${constants.uploadFolder}/${media.fileName}`;

  try {
    if (media.thumbnail) {
      fs.unlinkSync(`${constants.thumbnailsFolder}/${media.thumbnail}`);
    }
    fs.unlinkSync(file);
    await Media.deleteOne({ _id: media.id });

    return res.status(200).json({ message: responses.success });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const isOwner = (media, user) =>
  media.creatorId.toString() === user._id.toString();

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
