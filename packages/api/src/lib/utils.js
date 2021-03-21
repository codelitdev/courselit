/**
 * General utilities
 */
const fs = require("fs");
const { spawn } = require("child_process");

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

/**
 * A pure function to generate a string by appending current epoch
 * to the provided filename.
 *
 * @param {string} filename
 */
exports.uniqueFileNameGenerator = (filename) => {
  const extention = filename.split(".");
  const uniqueNameWithoutExtention = `${extention.slice(
    0,
    extention.length - 1
  )}_${Date.now()}`;

  return {
    name: uniqueNameWithoutExtention,
    ext: extention[extention.length - 1],
  };
};

/**
 * A wrapper to promisify the move function of express-upload.
 *
 * @param {object} file - The express-upload file object
 * @param {string} path - Where to move the current file
 */
exports.moveFile = (file, path) =>
  new Promise((resolve, reject) => {
    file.mv(path, (err) => {
      if (err) reject(err.message);

      resolve();
    });
  });

/**
 * Promisifies command line utility cwebp.
 *
 * @param {string} path - file path of the file to be converted
 * @param {quality} quality - a number representing quality of the output. 0 is worst and 100 is best.
 */
exports.convertToWebp = (path, quality = 75) =>
  new Promise((resolve, reject) => {
    const process = spawn(
      "cwebp",
      [`"${path}"`, `-o "${path}"`, `-q ${quality}`],
      {
        shell: true,
      }
    );

    process.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error("Error in converting the file to Webp format."));
      }

      resolve();
    });
  });

/**
 * Async handler for async middlewares.
 *
 * Copied from: https://stackoverflow.com/questions/61086833/async-await-in-express-middleware
 */
exports.asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
