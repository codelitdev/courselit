import GQLContext from "../../models/GQLContext";
import * as medialitService from "../../services/medialit";

export const getMedia = async (mediaId?: string) => {
    let media;

    if (mediaId) {
        media = await medialitService.getMedia(mediaId);
    }

    return media;
};

export const checkMediaForPublicAccess = async (
    mediaId: string
): Promise<boolean> => {
    const media = await getMedia(mediaId);
    if (!media) {
        return false;
    }
    return media.access === "public";
};
