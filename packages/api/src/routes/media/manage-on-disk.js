const thumbnail = require("@courselit/thumbnail");
const {
  foldersExist,
  uniqueFileNameGenerator,
  moveFile,
  createFolders,
  getParentDirectory,
  convertToWebp,
} = require("../../lib/utils.js");
const {
  uploadFolder,
  useWebp,
  webpOutputQuality,
  imagePattern,
  videoPattern,
} = require("../../config/constants.js");
const responses = require("../../config/strings").responses;
const constants = require("../../config/constants.js");
const Media = require("../../models/Media.js");
const { generateFolderPaths } = require("./utils");
const { rmdirSync } = require("fs");

const generateThumbnail = async ({
  workingDirectory,
  mimetype,
  originalFilePath,
}) => {
  const thumbPath = `${workingDirectory}/thumb.webp`;

  let isThumbGenerated = false; // to indicate if the thumbnail name is to be saved to the DB
  if (imagePattern.test(mimetype)) {
    await thumbnail.forImage(originalFilePath, thumbPath, {
      width: constants.thumbnailWidth,
    });
    isThumbGenerated = true;
  }
  if (videoPattern.test(mimetype)) {
    await thumbnail.forVideo(originalFilePath, thumbPath, {
      width: constants.thumbnailWidth,
      height: constants.thumbnailHeight,
    });
    isThumbGenerated = true;
  }

  return isThumbGenerated;
};

exports.upload = async (req, res) => {
  const data = req.body;
  const { file } = req.files;
  const fileName = uniqueFileNameGenerator(file.name);

  const directory = `${req.subdomain.name}/${req.user.userId}/${fileName.name}`;
  const absoluteDirectory = `${uploadFolder}/${directory}`;
  if (!foldersExist([absoluteDirectory])) {
    createFolders([absoluteDirectory]);
  }

  const fileExtension =
    useWebp && imagePattern.test(req.files.file.mimetype)
      ? "webp"
      : fileName.ext;
  const mainFilePath = `${absoluteDirectory}/main.${fileExtension}`;

  const fileNameWithDomainInfo = `${directory}/main.${fileExtension}`;
  try {
    await moveFile(req.files.file, mainFilePath);
    if (useWebp && imagePattern.test(req.files.file.mimetype)) {
      await convertToWebp(mainFilePath, webpOutputQuality);
    }

    let isThumbGenerated;
    try {
      isThumbGenerated = await generateThumbnail({
        workingDirectory: absoluteDirectory,
        mimetype: file.mimetype,
        originalFilePath: mainFilePath,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`Error in generating a thumbnail`, err);
    }

    const mediaObject = {
      domain: req.subdomain._id,
      originalFileName: file.name,
      file: fileNameWithDomainInfo,
      mimeType: req.files.file.mimetype,
      size: req.files.file.size,
      creatorId: req.user._id,
      thumbnail: isThumbGenerated ? `${directory}/thumb.webp` : "",
      altText: data.altText,
    };

    const media = await Media.create(mediaObject);

    return res.status(200).json({
      message: responses.success,
      media: {
        id: media.id,
        originalFileName: mediaObject.originalFileName,
        mimeType: mediaObject.mimeType,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.serve = async ({ media, req, res }) => {
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

exports.delete = async (media, res) => {
  try {
    const directory = getParentDirectory(media.file);
    const absoluteDirectory = `${uploadFolder}/${directory}`;

    rmdirSync(absoluteDirectory, { recursive: true });
    await media.delete();

    return res.status(200).json({ message: responses.success });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
