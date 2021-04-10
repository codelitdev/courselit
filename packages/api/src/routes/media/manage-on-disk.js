const thumbnail = require("@courselit/thumbnail");
const path = require("path");
const {
  foldersExist,
  uniqueFileNameGenerator,
  moveFile,
  convertToWebp,
  createFolders,
} = require("../../lib/utils.js");
const {
  uploadFolder,
  webpOutputQuality,
  useWebp,
} = require("../../config/constants.js");
const responses = require("../../config/strings").responses;
const constants = require("../../config/constants.js");
const Media = require("../../models/Media.js");
const { generateFolderPaths } = require("./utils");

exports.upload = async (req, res) => {
  const data = req.body;
  const thumbnailExtension = useWebp ? "webp" : "jpg";

  const { uploadFolderForDomain, thumbFolderForDomain } = generateFolderPaths({
    uploadFolder,
    domainName: req.subdomain.name,
  });
  if (!foldersExist([uploadFolderForDomain])) {
    createFolders([uploadFolderForDomain]);
  }
  if (!foldersExist([thumbFolderForDomain])) {
    createFolders([thumbFolderForDomain]);
  }

  const imagePattern = /image/;
  const videoPattern = /video/;

  // create unique file name for the uploaded file
  const fileName = uniqueFileNameGenerator(req.files.file.name);
  const filePath = path.join(
    uploadFolderForDomain,
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

  // generate thumbnails for videos and images
  const thumbPath = `${thumbFolderForDomain}/${fileName.name}.${thumbnailExtension}`;
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
    domain: req.subdomain._id,
    title: req.files.file.name,
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
