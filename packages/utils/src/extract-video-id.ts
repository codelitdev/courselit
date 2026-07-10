export type SupportedVideoPlatform = "youtube" | "vimeo";

const YOUTUBE_HOSTNAMES = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "youtu.be",
]);

const VIMEO_HOSTNAMES = new Set([
    "vimeo.com",
    "www.vimeo.com",
    "player.vimeo.com",
]);

const isNumeric = (value: string) => /^\d+$/.test(value);

const extractYouTubeVideoId = (parsedUrl: URL) => {
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!YOUTUBE_HOSTNAMES.has(hostname)) {
        return null;
    }

    if (hostname === "youtu.be") {
        return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const firstPart = pathParts[0];
    const secondPart = pathParts[1];

    if (
        (firstPart === "embed" ||
            firstPart === "v" ||
            firstPart === "shorts" ||
            firstPart === "live") &&
        secondPart
    ) {
        return secondPart;
    }

    return null;
};

const extractVimeoVideoId = (parsedUrl: URL) => {
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!VIMEO_HOSTNAMES.has(hostname)) {
        return null;
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    for (let index = pathParts.length - 1; index >= 0; index--) {
        if (isNumeric(pathParts[index])) {
            return pathParts[index];
        }
    }

    return null;
};

export default function extractVideoId(
    url?: string,
    platform?: SupportedVideoPlatform,
) {
    if (!url) {
        return null;
    }

    const normalizedUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
        ? url
        : `https://${url}`;

    try {
        const parsedUrl = new URL(normalizedUrl);

        if (platform === "youtube") {
            return extractYouTubeVideoId(parsedUrl);
        }

        if (platform === "vimeo") {
            return extractVimeoVideoId(parsedUrl);
        }

        return (
            extractYouTubeVideoId(parsedUrl) || extractVimeoVideoId(parsedUrl)
        );
    } catch {
        return null;
    }
}
