"use strict";

const internalResponse = require("./config/strings.js").internal;
const { uploadFolder, thumbnailsFolder } = require("./config/constants.js");
const fs = require("fs");

const checkForNecessaryEnvironmentVars = () => {
  for (const field of ["JWT_SECRET"]) {
    if (!process.env[field]) {
      console.error(`${internalResponse.error_env_var_undefined}: ${field}`);
      process.exit(1);
    }
  }
};

const createFoldersForUserData = () => {
  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
  }
  if (!fs.existsSync(thumbnailsFolder)) {
    fs.mkdirSync(thumbnailsFolder, { recursive: true });
  }
};

checkForNecessaryEnvironmentVars();
createFoldersForUserData();

const app = require("./app.js");
app.listen(process.env.PORT || 80);
