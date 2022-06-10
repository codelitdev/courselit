import { responses } from "../../config/strings";
import constants from "../../config/constants";
import { Lesson } from "../../models/Lesson";
const { text, audio, video, pdf } = constants;

export const lessonValidator = (lessonData: Lesson) => {
    if (lessonData.type === text && !lessonData.content) {
        throw new Error(responses.content_cannot_be_null);
    }

    if (
        (lessonData.type === audio ||
            lessonData.type === video ||
            lessonData.type === pdf) &&
        !lessonData.mediaId
    ) {
        throw new Error(responses.media_id_cannot_be_null);
    }
};
