import { CommunityMedia } from "@courselit/common-models";

export interface MediaItem extends CommunityMedia {
    // fileSize?: string;
    file?: File;
}
