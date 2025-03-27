import { MediaAccessType } from "./constants";

export type MediaAccessType =
    (typeof MediaAccessType)[keyof typeof MediaAccessType];

export interface Media {
    mediaId: string;
    originalFileName: string;
    mimeType: string;
    size: number;
    access: MediaAccessType;
    thumbnail: string;
    caption?: string;
    file?: string;
}
