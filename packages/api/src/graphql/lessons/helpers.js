const strings = require("../../config/strings.js");
const { text, audio, video, pdf } = require("../../config/constants.js");

exports.lessonValidator = (lessonData) => {
  if (lessonData.type === text && !lessonData.content) {
    throw new Error(strings.responses.content_cannot_be_null);
  }

  if (
    (lessonData.type === audio ||
      lessonData.type === video ||
      lessonData.type === pdf) &&
    !lessonData.contentURL
  ) {
    throw new Error(strings.responses.content_url_cannot_be_null);
  }
};
