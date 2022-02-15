const aws = require("aws-sdk");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
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

    const settings = Object.assign(
      {},
      {
        Bucket: cloudBucket,
      },
      params
    );
    s3.putObject(settings, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
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

  const command = new GetObjectCommand({
    // ACL: "public-read",
    Bucket: cloudBucket,
    Key: name,
    // ContentType: mimetype,
  });

  const url = await getSignedUrl(client, command);
  return url;
};

exports.putObjectAclPromise = (params) =>
  new Promise((resolve, reject) => {
    const endpoint = new aws.Endpoint(cloudEndpoint);
    const s3 = new aws.S3({
      endpoint,
      accessKeyId: cloudKey,
      secretAccessKey: cloudSecret,
    });

    const settings = Object.assign(
      {},
      {
        Bucket: cloudBucket,
      },
      params
    );
    s3.putObjectAcl(settings, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
