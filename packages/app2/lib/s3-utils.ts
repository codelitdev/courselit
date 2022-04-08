import aws from "aws-sdk";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import constants from "../config/constants";
const { cloudEndpoint, cloudKey, cloudSecret, cloudBucket, cloudRegion } =
  constants;

export const generateFolderPaths = ({
  uploadFolder,
  domainName,
}: {
  uploadFolder: string;
  domainName: string;
}) => {
  const uploadRootFolderForDomain = `${uploadFolder}/${domainName}`;
  const uploadFolderForDomain = `${uploadRootFolderForDomain}/files`;
  const thumbFolderForDomain = `${uploadRootFolderForDomain}/thumbs`;
  return { uploadFolderForDomain, thumbFolderForDomain };
};

export const putObjectPromise = (params: any) =>
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

export const deleteObjectPromise = (params: any) =>
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

export const generateSignedUrl = async ({
  name,
  mimetype,
}: {
  name: string;
  mimetype?: string;
}) => {
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
  });

  const url = await getSignedUrl(client, command);
  return url;
};

export const putObjectAclPromise = (params: any) =>
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
