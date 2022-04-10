const strings = require("../../config/strings");
const { text, audio, video, pdf } = require("../../config/constants");

exports.lessonValidator = (lessonData) => {
  if (lessonData.type === text && !lessonData.content) {
    throw new Error(strings.responses.content_cannot_be_null);
  }

  if (
    (lessonData.type === audio ||
      lessonData.type === video ||
      lessonData.type === pdf) &&
    !lessonData.mediaId
  ) {
    throw new Error(strings.responses.media_id_cannot_be_null);
  }
};
