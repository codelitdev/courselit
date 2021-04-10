"use strict";

const internalResponse = require("./config/strings.js").internal;
const {
  uploadFolder,
  cloudEndpoint,
  cloudKey,
  cloudSecret,
  useCloudStorage,
} = require("./config/constants.js");
const { createFolders } = require("./lib/utils.js");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const validateEnvironmentVars = () => {
  for (const field of ["USER_CONTENT_DIRECTORY", "JWT_SECRET"]) {
    if (!process.env[field]) {
      console.error(`${internalResponse.error_env_var_undefined}: ${field}`);
      process.exit(1);
    }
  }
};

const validateCloudSettings = () => {
  if (!cloudEndpoint || !cloudKey || !cloudSecret) {
    console.error(internalResponse.invalid_cloud_storage_settings);
    process.exit(1);
  }
};

validateEnvironmentVars();
if (useCloudStorage) {
  validateCloudSettings();
} else {
  createFolders([uploadFolder]);
}

const app = require("./app.js");

const port = process.env.PORT || 80;
app.listen(port, () =>
  console.info(`${internalResponse.app_running} port ${port}`)
);
