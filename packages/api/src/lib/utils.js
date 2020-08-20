/**
 * General utilities
 */
const fs = require("fs");

exports.capitalize = (s) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.foldersExist = (folders) => {
  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      return false;
    }
  }

  return true;
};

exports.createFolders = (folders) => {
  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
};
