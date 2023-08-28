import { Media } from "@courselit/common-models";
import { responses } from "../config/strings.ts";

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

    if (response.message === "success") {
        return true;
    } else {
        throw new Error(response.message);
    }
}

function checkMediaLitAPIKeyOrThrow() {
    if (!process.env.MEDIALIT_APIKEY) {
        throw new Error(responses.medialit_apikey_notfound);
    }
}
