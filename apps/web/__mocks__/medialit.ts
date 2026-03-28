class MediaLit {
    endpoint: string;
    constructor(config: { endpoint?: string }) {
        this.endpoint = config.endpoint || "https://medialit.example.com";
    }

    async get(mediaId: string) {
        return {
            mediaId,
            file: "mock-file",
            originalFileName: "mock-file",
            mimeType: "image/png",
            size: 0,
            access: "public",
            url: `https://medialit.example.com/${mediaId}/main.png`,
        };
    }

    async getSignature(_: { group: string }) {
        return "mock-signature";
    }

    async delete(_: string) {
        return true;
    }
}

export { MediaLit };
