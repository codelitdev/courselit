import { FetchBuilder } from "@courselit/utils";
import { Media } from "@courselit/common-models";

async function getPresignedUrl(url: string) {
    const fetch = new FetchBuilder()
        .setUrl(`${url}/api/media/presigned`)
        .setIsGraphQLEndpoint(false)
        .build();
    return await fetch.exec();
}

export interface UploadedImage {
    mediaId: string;
    src: string;
    fileName?: string;
}

export async function uploadImageToMediaLit({
    url,
    file,
    fileSizeLimit = 2097152, // 2 MB,
    onError,
}: {
    url: string;
    file: File;
    fileSizeLimit?: number;
    onError?: (args: any) => void;
}): Promise<UploadedImage> {
    if (file.size > fileSizeLimit) {
        if (onError) {
            onError("File is larger than 2MB");
            return { src: "", mediaId: "", fileName: "" };
        } else {
            throw new Error("File is larger than 2MB");
        }
    }

    const { signature, endpoint } = await getPresignedUrl(url);

    const formData = new FormData();
    formData.append("caption", file.name);
    formData.append("access", "public");
    formData.append("file", file);

    const response = await fetch(`${endpoint}/media/create`, {
        method: "POST",
        headers: {
            "x-medialit-signature": signature,
        },
        body: formData,
    });

    const data: Media = await response.json();

    return {
        src: data.file,
        fileName: data.originalFileName,
        mediaId: data.mediaId,
    };
}
