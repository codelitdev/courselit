import { Media } from "@courselit/common-models";
import constants from "../../config/constants";
import * as medialitService from "../../services/medialit";
const { privateMedia } = constants;

export const getMedia = async (media?: Media) => {
    if (media && media.access === privateMedia) {
        return medialitService.getMedia(media.mediaId);
    }

    return media;
};
