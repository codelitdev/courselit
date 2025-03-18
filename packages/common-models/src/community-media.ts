import { Media } from "./media";

export interface CommunityMedia {
    type: "youtube" | "pdf" | "image" | "video" | "gif";
    title: string;
    url?: string;
    media?: Media;
}
