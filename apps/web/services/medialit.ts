"use server";

import { Media } from "@courselit/common-models";
import { MediaLit } from "medialit";

function getMediaLitClient() {
    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });

    return medialit;
}

export async function getMedia(mediaId: string): Promise<Media> {
    const medialitClient = getMediaLitClient();
    const media = await medialitClient.get(mediaId);
    return media as unknown as Media;
}

export async function getPresignedUrlForUpload(
    domain: string,
): Promise<string> {
    const medialitClient = getMediaLitClient();
    const url = await medialitClient.getSignature({
        group: domain,
    });
    return url;
}

export async function deleteMedia(mediaId: string): Promise<boolean> {
    const medialitClient = getMediaLitClient();
    await medialitClient.delete(mediaId);
    return true;
}

export async function sealMedia(mediaId: string): Promise<Media> {
    const medialitClient = getMediaLitClient();
    const media = await medialitClient.seal(mediaId);
    return media as unknown as Media;
}
