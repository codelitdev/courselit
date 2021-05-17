const thumbnail = require("@courselit/thumbnail");
const { createReadStream, rmdirSync } = require("fs");
const {
  cdnEndpoint,
  tempFileDirForUploads,
  imagePattern,
  videoPattern,
  useWebp,
  webpOutputQuality,
} = require("../../config/constants");
const { responses } = require("../../config/strings");
const {
  uniqueFileNameGenerator,
  foldersExist,
  createFolders,
  moveFile,
  convertToWebp,
} = require("../../lib/utils");
const constants = require("../../config/constants.js");
const Media = require("../../models/Media.js");
const { putObjectPromise, deleteObjectPromise } = require("./utils");

const generateAndUploadThumbnail = async ({
  workingDirectory,
  cloudDirectory,
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

  if (isThumbGenerated) {
    await putObjectPromise({
      Key: `${cloudDirectory}/thumb.webp`,
      Body: createReadStream(thumbPath),
      ContentType: "image/webp",
    });
  }

  return isThumbGenerated;
};

exports.upload = async (req, res) => {
  const data = req.body;
  const { file } = req.files;
  const fileName = uniqueFileNameGenerator(file.name);

  const temporaryFolderForWork = `${tempFileDirForUploads}/${fileName.name}`;
  if (!foldersExist([temporaryFolderForWork])) {
    createFolders([temporaryFolderForWork]);
  }

  const fileExtension =
    useWebp && imagePattern.test(req.files.file.mimetype)
      ? "webp"
      : fileName.ext;
  const mainFilePath = `${temporaryFolderForWork}/main.${fileExtension}`;
  const directory = `${req.subdomain.name}/${req.user.userId}/${fileName.name}`;
  try {
    await moveFile(file, mainFilePath);
    if (useWebp && imagePattern.test(req.files.file.mimetype)) {
      await convertToWebp(mainFilePath, webpOutputQuality);
    }

    const fileNameWithDomainInfo = `${directory}/main.${fileExtension}`;
    await putObjectPromise({
      Key: fileNameWithDomainInfo,
      Body: createReadStream(mainFilePath),
      ContentType: file.mimetype,
    });

    let isThumbGenerated;
    try {
      isThumbGenerated = await generateAndUploadThumbnail({
        workingDirectory: temporaryFolderForWork,
        cloudDirectory: directory,
        mimetype: file.mimetype,
        originalFilePath: mainFilePath,
      });
    } catch (err) {}

    rmdirSync(temporaryFolderForWork, { recursive: true });

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

exports.serve = async ({ media, res }) => {
  res.status(200).json({
    media: {
      id: media.id,
      file: `${cdnEndpoint}/${media.file}`,
      thumbnail: media.thumbnail ? `${cdnEndpoint}/${media.thumbnail}` : "",
      altText: media.altText,
    },
  });
};

exports.delete = async (media, res) => {
  try {
    await deleteObjectPromise({ Key: media.file });
    if (media.thumbnail) {
      await deleteObjectPromise({ Key: media.thumbnail });
    }
    await media.delete();

    return res.status(200).json({ message: responses.success });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
