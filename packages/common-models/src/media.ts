export default interface Media {
    mediaId: string;
    originalFileName: string;
    mimeType: string;
    size: number;
    access: "public" | "private";
    thumbnail: string;
    caption?: string;
    file?: string;
}
