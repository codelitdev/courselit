const aws = require("aws-sdk");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  cloudEndpoint,
  cloudKey,
  cloudSecret,
  cloudBucket,
  cloudRegion,
} = require("../../config/constants");

exports.generateFolderPaths = ({ uploadFolder, domainName }) => {
  const uploadRootFolderForDomain = `${uploadFolder}/${domainName}`;
  const uploadFolderForDomain = `${uploadRootFolderForDomain}/files`;
  const thumbFolderForDomain = `${uploadRootFolderForDomain}/thumbs`;
  return { uploadFolderForDomain, thumbFolderForDomain };
};

exports.putObjectPromise = (params) =>
  new Promise((resolve, reject) => {
    const endpoint = new aws.Endpoint(cloudEndpoint);
    const s3 = new aws.S3({
      endpoint,
      accessKeyId: cloudKey,
      secretAccessKey: cloudSecret,
    });

    s3.putObject(
      Object.assign(
        {},
        {
          Bucket: cloudBucket,
          ACL: "public-read",
        },
        params
      ),
      (err, result) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

exports.deleteObjectPromise = (params) =>
  new Promise((resolve, reject) => {
    const endpoint = new aws.Endpoint(cloudEndpoint);
    const s3 = new aws.S3({
      endpoint,
      accessKeyId: cloudKey,
      secretAccessKey: cloudSecret,
    });

    s3.deleteObject(
      Object.assign(
        {},
        {
          Bucket: cloudBucket,
        },
        params
      ),
      (err, result) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

exports.generateSignedUrl = async ({ name, mimetype }) => {
  const client = new S3Client({
    region: cloudRegion,
    endpoint: cloudEndpoint,
    credentials: {
      accessKeyId: cloudKey,
      secretAccessKey: cloudSecret,
    },
  });

  const command = new PutObjectCommand({
    ACL: "public-read",
    Bucket: cloudBucket,
    Key: name,
    ContentType: mimetype,
  });

  return await getSignedUrl(client, command);
};
