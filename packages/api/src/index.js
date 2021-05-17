"use strict";

require("dotenv").config();
const internalResponse = require("./config/strings.js").internal;
const { uploadFolder, useCloudStorage } = require("./config/constants.js");
const { createFolders } = require("./lib/utils.js");

const validateEnvironmentVars = () => {
  const commonVars = [
    "JWT_SECRET",
    "TEMP_DIR_FOR_UPLOADS",
    "EMAIL_HOST",
    "EMAIL_USER",
    "EMAIL_PASS",
    "EMAIL_FROM",
  ];

  const environmentVarsForLocalStorage = [
    "USER_CONTENT_DIRECTORY",
    "CDN_ENDPOINT",
  ];

  const environmentVarsForCloudStorage = [
    "CLOUD_ENDPOINT",
    "CLOUD_REGION",
    "CLOUD_KEY",
    "CLOUD_SECRET",
    "CLOUD_BUCKET_NAME",
    "CDN_ENDPOINT",
  ];

  const environmentVarsToCheck = [
    ...commonVars,
    ...(useCloudStorage
      ? environmentVarsForCloudStorage
      : environmentVarsForLocalStorage),
  ];

  for (const field of environmentVarsToCheck) {
    if (!process.env[field]) {
      console.error(`${internalResponse.error_env_var_undefined}: ${field}`);
      process.exit(1);
    }
  }
};

validateEnvironmentVars();
if (!useCloudStorage) {
  createFolders([uploadFolder]);
}

const app = require("./app.js");

const port = process.env.PORT || 80;
app.listen(port, () =>
  console.info(`${internalResponse.app_running} port ${port}`)
);
