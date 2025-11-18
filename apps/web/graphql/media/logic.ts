import { Media } from "@courselit/common-models";
import constants from "../../config/constants";
import * as medialitService from "../../services/medialit";
const { privateMedia } = constants;

export const getMedia = async (media?: Media | Partial<Media>) => {
    if (media && media.access === privateMedia && media.mediaId) {
        return medialitService.getMedia(media.mediaId);
    }

    return media;
};
