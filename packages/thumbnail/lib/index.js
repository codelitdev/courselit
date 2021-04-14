"use strict";

const { spawn } = require("child_process");

// Defaults for image thumbnails
const imageOptions = {
  width: 100,
  height: 100,
  preserveAspectRatio: true,
};

// Defaults for video thumbnails
const videoOptions = {
  width: 100,
  height: -1,
};

const VIDEO_TYPE = "video";
const IMAGE_TYPE = "image";

/**
 * A pure function to generate thumbnail for an image or a video.
 *
 * @param {string} source path to source image file
 * @param {string} destination path to destination folder
 * @param {object} options configuration options
 * @param {string} type video|image
 */
const thumbGenerator = (source, destination, options, type) =>
  new Promise((resolve, reject) => {
    if (!source || !destination) {
      reject(new Error("Source or destination path missing"));
    }

    let convert;
    if (type === IMAGE_TYPE) {
      convert = spawn("convert", [
        source,
        "-thumbnail",
        `${options.width}x${options.height}${
          options.preserveAspectRatio ? "" : "!"
        }`,
        destination,
      ]);
    } else {
      convert = spawn(
        "ffmpeg",
        [
          "-itsoffset -1",
          `-i "${source}"`,
          "-vframes 1",
          `-filter:v scale="${options.width}:${options.height}"`,
          `"${destination}"`,
        ],
        { shell: true }
      );
    }

    // convert.stdout.on('data', data => console.log(data.toString()))
    if (process.env.DEBUG === "true") {
      // eslint-disable-next-line no-console
      convert.stderr.on("data", (data) => console.error(data.toString()));
    }

    convert.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Child process exited with code ${code}`));
      }

      resolve();
    });
  });

const forImage = (source, destination, options) =>
  thumbGenerator(
    source,
    destination,
    Object.assign({}, imageOptions, options),
    IMAGE_TYPE
  );

const forVideo = (source, destination, options) =>
  thumbGenerator(
    source,
    destination,
    Object.assign({}, videoOptions, options),
    VIDEO_TYPE
  );

module.exports = {
  forImage,
  forVideo,
};
