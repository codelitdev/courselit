/**
 * An end point for managing file uploads.
 */
const express = require("express");
const Media = require("../models/Media.js");
const responses = require("../config/strings").responses;
const constants = require("../config/constants.js");
const thumbnail = require("media-thumbnail");
const path = require("path");
const fs = require("fs");

/**
 * A pure function to generate a string by appending current epoch
 * to the provided filename.
 *
 * @param {string} filename
 */
const uniqueFileNameGenerator = (filename) => {
  const extention = filename.split(".");
  const uniqueNameWithoutExtention = `${extention.slice(
    0,
    extention.length - 1
  )}_${Date.now()}`;

  return {
    name: uniqueNameWithoutExtention,
    ext: extention[extention.length - 1],
  };
};

/**
 * A wrapper to promisify the move function of express-upload.
 *
 * @param {object} file express-upload file object
 * @param {string} path where to move the current file
 */
const move = (file, path) =>
  new Promise((resolve, reject) => {
    file.mv(path, (err) => {
      if (err) reject(err.message);

      resolve();
    });
  });

const getHandler = async (req, res) => {
  const media = await Media.findById(req.params.mediaId);

  const { thumb } = req.query;

  if (thumb === "1") {
    res.contentType(constants.thumbnailContentType);
    res.sendFile(`${constants.thumbnailsFolder}/${media.thumbnail}`);
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

  // create unique file name for the uploaded file
  const fileName = uniqueFileNameGenerator(req.files.file.name);
  const filePath = path.join(
    constants.uploadFolder,
    `${fileName.name}.${fileName.ext}`
  );

  // move the uploaded file to the upload folder
  try {
    await move(req.files.file, filePath);
  } catch (err) {
    console.log(constants.uploadFolder, err);
    return res.status(500).json({ message: responses.error_in_moving_file });
  }

  // generate thumbnail for a video or image
  const imagePattern = /image/;
  const videoPattern = /video/;
  const thumbPath = `${constants.thumbnailsFolder}/${fileName.name}.${constants.thumbnailFileExtension}`;
  let isThumbGenerated = false; // to indicate if the thumbnail name is to be saved to the DB
  try {
    if (imagePattern.test(req.files.file.mimetype)) {
      await thumbnail.forImage(filePath, thumbPath, {
        width: constants.thumbnailWidth,
      });
      isThumbGenerated = true;
    }
    if (videoPattern.test(req.files.file.mimetype)) {
      await thumbnail.forVideo(filePath, thumbPath, {
        width: constants.thumbnailWidth,
        height: constants.thumbnailHeight,
      });
      isThumbGenerated = true;
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  const mediaObject = {
    title: data.title,
    originalFileName: req.files.file.name,
    fileName: `${fileName.name}.${fileName.ext}`,
    creatorId: req.user._id,
    mimeType: req.files.file.mimetype,
    size: req.files.file.size,
  };
  if (isThumbGenerated) {
    mediaObject.thumbnail = `${fileName.name}.${constants.thumbnailFileExtension}`;
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
  const media = await Media.findById(req.params.mediaId);

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
