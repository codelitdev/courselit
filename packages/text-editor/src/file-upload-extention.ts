import { FetchBuilder } from "@courselit/utils";
import { Media } from "@courselit/common-models";

type SetProgress = (progress: number) => void;

async function getPresignedUrl(url: string) {
    const fetch = new FetchBuilder()
        .setUrl(`${url}/api/media/presigned`)
        .setIsGraphQLEndpoint(false)
        .build();
    return await fetch.exec();
}

export interface UploadedImage {
    src: string;
    fileName?: string;
}

export async function uploadImageToMediaLit(
    url: string,
    file: File,
    progress?: SetProgress,
): Promise<UploadedImage> {
    if (file.size > 2097152) {
        throw new Error("File is larger than 2MB");
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

    if (progress) {
        progress(1);
    }

    const data: Media = await response.json();

    return {
        src: data.file,
        fileName: data.originalFileName,
    };
}
