import { replaceTempMediaWithSealedMediaInPageLayout } from "../replace-temp-media-with-sealed-media-in-page-layout";
import { sealMedia } from "@/services/medialit";

jest.mock("@/services/medialit");

const mockSealMedia = sealMedia as jest.Mock;

describe("replaceTempMediaWithSealedMediaInPageLayout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should replace main media URLs with sealed URLs", async () => {
        const mediaId = "IZGUXrznb9_BnmiZ19jnFVkFFwyzmyQAoSFp7D2X";
        const signedUrl = `https://bucket/i/${mediaId}/main.webp?Expires=123&Signature=abc`;
        const sealedFileUrl = `https://bucket/p/${mediaId}/main.webp`;
        const sealedThumbUrl = `https://bucket/p/${mediaId}/thumb.webp`;

        const layout = [
            {
                widgetId: "test-widget",
                settings: {
                    media: {
                        mediaId: mediaId,
                        file: signedUrl,
                    },
                },
            },
        ];

        mockSealMedia.mockResolvedValue({
            mediaId,
            file: sealedFileUrl,
            thumbnail: sealedThumbUrl,
        });

        const result =
            await replaceTempMediaWithSealedMediaInPageLayout(layout);

        expect(sealMedia).toHaveBeenCalledWith(mediaId);
        expect(result[0].settings.media.file).toBe(sealedFileUrl);
    });

    it("should replace thumbnail URLs with sealed URLs", async () => {
        const mediaId = "IZGUXrznb9_BnmiZ19jnFVkFFwyzmyQAoSFp7D2X";
        const signedThumbUrl = `https://bucket/i/${mediaId}/thumb.webp?Expires=123&Signature=abc`;
        const sealedFileUrl = `https://bucket/p/${mediaId}/main.webp`;
        const sealedThumbUrl = `https://bucket/p/${mediaId}/thumb.webp`;

        const layout = {
            someProp: {
                nested: {
                    file: `https://bucket/i/${mediaId}/main.png`,
                    thumbnail: signedThumbUrl,
                },
            },
        };

        mockSealMedia.mockResolvedValue({
            mediaId,
            file: sealedFileUrl,
            thumbnail: sealedThumbUrl,
        });

        const result =
            await replaceTempMediaWithSealedMediaInPageLayout(layout);

        expect(result.someProp.nested.thumbnail).toBe(sealedThumbUrl);
    });

    it("should handle nested arrays and objects", async () => {
        const mediaId1 = "media-1";
        const mediaId2 = "media-2";

        const signedUrl1 = `https://bucket/i/${mediaId1}/main.png`;
        const signedUrl2 = `https://bucket/i/${mediaId2}/main.png`;

        const sealedUrl1 = `https://bucket/p/${mediaId1}/main.png`;
        const sealedUrl2 = `https://bucket/p/${mediaId2}/main.png`;

        const layout = [
            {
                items: [{ image: signedUrl1 }, { image: signedUrl2 }],
            },
        ];

        mockSealMedia.mockImplementation(async (id) => {
            if (id === mediaId1) return { file: sealedUrl1, thumbnail: "" };
            if (id === mediaId2) return { file: sealedUrl2, thumbnail: "" };
            return null;
        });

        const result =
            await replaceTempMediaWithSealedMediaInPageLayout(layout);

        expect(result[0].items[0].image).toBe(sealedUrl1);
        expect(result[0].items[1].image).toBe(sealedUrl2);
    });

    it("should ignore URLs that do not match the structure", async () => {
        const layout = {
            url: "https://google.com/some/path",
        };

        const result =
            await replaceTempMediaWithSealedMediaInPageLayout(layout);
        expect(result.url).toBe("https://google.com/some/path");
    });

    it("should define traverse function to handle deeply nested media replacements", async () => {
        // This test case specifically mimics the user's provided terminal output structure
        const mediaId = "IZGUXrznb9_BnmiZ19jnFVkFFwyzmyQAoSFp7D2X";
        const signedFile = `https://bucket/i/${mediaId}/main.webp?Expires=1769867104&Key-Pair-Id=K2R29YJF4UHNZO&Signature=rOl0JYdvRz`;
        const signedThumb = `https://bucket/i/${mediaId}/thumb.webp?Expires=1769867104&Key-Pair-Id=K2R29YJF4UHNZO&Signature=g5aqyntG1iP`;

        const sealedFile = `https://bucket/p/${mediaId}/main.webp`;
        const sealedThumb = `https://bucket/p/${mediaId}/thumb.webp`;

        const inputLayout = [
            {
                name: "header",
                shared: true,
                deleteable: false,
                widgetId: "JTJrDLBlvFDp-ocZ9abs2",
            },
            {
                widgetId: "AirNFjSBN46gy1yfOz09w",
                name: "media",
                deleteable: true,
                settings: {
                    pageId: "sealed-media-1",
                    type: "site",
                    entityId: "skillviss",
                    media: {
                        mediaId: mediaId,
                        originalFileName: "thumb (1).webp",
                        mimeType: "image/webp",
                        size: 5752,
                        access: "public",
                        file: signedFile,
                        thumbnail: signedThumb,
                        caption: null,
                    },
                    mediaRadius: 2,
                    playVideoInModal: false,
                    aspectRatio: "16/9",
                    objectFit: "cover",
                    hasBorder: true,
                },
            },
            {
                name: "footer",
                shared: true,
                deleteable: false,
                widgetId: "vh1fwLAQYFoTC-WFmyJ5O",
            },
        ];

        mockSealMedia.mockResolvedValue({
            mediaId: mediaId,
            file: sealedFile,
            thumbnail: sealedThumb,
        });

        const result =
            await replaceTempMediaWithSealedMediaInPageLayout(inputLayout);

        // Assertions based on "This is the final URL with media object containing sealed URLs"
        const mediaWidget = result.find((w: any) => w.name === "media");
        expect(mediaWidget.settings.media.file).toBe(sealedFile);
        expect(mediaWidget.settings.media.thumbnail).toBe(sealedThumb);
    });
});
