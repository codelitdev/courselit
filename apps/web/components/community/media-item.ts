import { CommunityMedia } from "@courselit/common-models";

export interface MediaItem extends CommunityMedia {
    file?: File;
    clientId?: string;
    fileSize?: string;
}
