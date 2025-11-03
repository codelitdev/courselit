import { Media } from "./media";

export const CommunityMediaTypes = {
    YOUTUBE: "youtube",
    PDF: "pdf",
    IMAGE: "image",
    VIDEO: "video",
    GIF: "gif",
} as const;
export type CommunityMediaType =
    (typeof CommunityMediaTypes)[keyof typeof CommunityMediaTypes];

export interface CommunityMedia {
    type: CommunityMediaType;
    title: string;
    url?: string;
    media?: Media;
}
