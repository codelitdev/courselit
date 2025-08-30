import { Media } from "@courselit/common-models";
import { responses } from "../config/strings";

const medialitServer = process.env.MEDIALIT_SERVER || "https://medialit.cloud";

interface GetPaginatedMediaProps {
    group: string;
    page?: number;
    limit?: number;
    access?: "public" | "private";
}

export async function getPaginatedMedia({
    group,
    page,
    limit,
    access,
}: GetPaginatedMediaProps): Promise<Media[]> {
    checkMediaLitAPIKeyOrThrow();
    const urlParams = new URLSearchParams();
    urlParams.append("group", group);
    urlParams.append("page", page ? page.toString() : "1");
    urlParams.append("limit", limit ? limit.toString() : "20");
    if (access) {
        urlParams.append("access", access);
    }

    const response: any = await fetch(
        `${medialitServer}/media/get?` + urlParams.toString(),
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                apikey: process.env.MEDIALIT_APIKEY,
            }),
            credentials: "same-origin",
        },
    );
    const jsonResponse = await response.json();

    if (response.status === 200) {
        return jsonResponse;
    } else {
        throw new Error(jsonResponse.error);
    }
}

export async function getMedia(mediaId: string): Promise<Media> {
    checkMediaLitAPIKeyOrThrow();
    let response: any = await fetch(`${medialitServer}/media/get/${mediaId}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            apikey: process.env.MEDIALIT_APIKEY,
        }),
    });
    response = await response.json();
    return response;
}

export async function getPresignedUrlForUpload(
    domain: string,
): Promise<string> {
    checkMediaLitAPIKeyOrThrow();
    let response: any = await fetch(
        `${medialitServer}/media/presigned/create`,
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                apikey: process.env.MEDIALIT_APIKEY,
                group: domain,
            }),
        },
    );
    response = await response.json();

    if (response.error) {
        throw new Error(response.error);
    }

    return response.message;
}

export async function deleteMedia(mediaId: string): Promise<boolean> {
    checkMediaLitAPIKeyOrThrow();
    let response: any = await fetch(
        `${medialitServer}/media/delete/${mediaId}`,
        {
            method: "DELETE",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                apikey: process.env.MEDIALIT_APIKEY,
            }),
        },
    );
    response = await response.json();

    if (response.error) {
        throw new Error(response.error);
    }

    return response.message === "success";
}

function checkMediaLitAPIKeyOrThrow() {
    if (!process.env.MEDIALIT_APIKEY) {
        throw new Error(responses.medialit_apikey_notfound);
    }
}

// Chunked upload functions
export interface ChunkedUploadInit {
    fileName: string;
    fileSize: number;
    mimeType: string;
    totalChunks: number;
    access?: string;
    caption?: string;
    group?: string;
}

export interface ChunkedUploadResponse {
    uploadId: string;
    message: string;
}

export interface ChunkUploadResponse {
    message: string;
    uploadedChunks: number;
    totalChunks: number;
}

export async function initializeChunkedUpload(
    params: ChunkedUploadInit,
    presignedUrl: string,
): Promise<ChunkedUploadResponse> {
    const response = await fetch(`${presignedUrl.replace('/create', '/chunked/init')}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initialize chunked upload");
    }

    return response.json();
}

export async function uploadChunk(
    uploadId: string,
    chunkNumber: number,
    chunk: Blob,
    presignedUrl: string,
): Promise<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkNumber", chunkNumber.toString());

    const baseUrl = presignedUrl.split('?')[0].replace('/create', '');
    const queryParams = presignedUrl.split('?')[1] || '';
    const uploadUrl = `${baseUrl}/chunked/upload/${uploadId}?${queryParams}`;

    const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload chunk");
    }

    return response.json();
}

export async function completeChunkedUpload(
    uploadId: string,
    presignedUrl: string,
): Promise<Media> {
    const baseUrl = presignedUrl.split('?')[0].replace('/create', '');
    const queryParams = presignedUrl.split('?')[1] || '';
    const completeUrl = `${baseUrl}/chunked/complete/${uploadId}?${queryParams}`;

    const response = await fetch(completeUrl, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete chunked upload");
    }

    return response.json();
}

export async function abortChunkedUpload(
    uploadId: string,
    presignedUrl: string,
): Promise<void> {
    const baseUrl = presignedUrl.split('?')[0].replace('/create', '');
    const queryParams = presignedUrl.split('?')[1] || '';
    const abortUrl = `${baseUrl}/chunked/abort/${uploadId}?${queryParams}`;

    const response = await fetch(abortUrl, {
        method: "DELETE",
        headers: {
            "content-type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to abort chunked upload");
    }
}
