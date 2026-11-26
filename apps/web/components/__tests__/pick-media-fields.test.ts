import { pickMediaFields } from "../../../../packages/components-library/src/hooks/pick-media-fields";

describe("pickMediaFields", () => {
    it("keeps only the fields MediaInput accepts", () => {
        const uploaded = {
            mediaId: "media-1",
            originalFileName: "logo.png",
            mimeType: "image/png",
            size: 3570,
            access: "public",
            group: "school.courselit.app",
            file: "https://cdn.example.com/i/media-1/main.png",
            thumbnail: "https://cdn.example.com/i/media-1/thumb.webp",
            caption: "Logo",
            processing: { status: "pending" },
            derivatives: { thumbnail: { status: "ready" } },
        };

        expect(pickMediaFields(uploaded)).toEqual({
            mediaId: "media-1",
            originalFileName: "logo.png",
            mimeType: "image/png",
            size: 3570,
            access: "public",
            file: "https://cdn.example.com/i/media-1/main.png",
            thumbnail: "https://cdn.example.com/i/media-1/thumb.webp",
            caption: "Logo",
        });
    });

    it("leaves out fields the response doesn't have", () => {
        expect(
            pickMediaFields({ mediaId: "media-2", access: "private" }),
        ).toEqual({ mediaId: "media-2", access: "private" });
    });
});
