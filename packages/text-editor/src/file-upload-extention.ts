import { DelayedPromiseCreator, ErrorConstant, invariant } from "remirror";
import { FetchBuilder } from "@courselit/utils";
import { Media } from "@courselit/common-models";
import { ImageAttributes } from "remirror/extensions";

type SetProgress = (progress: number) => void;

interface FileWithProgress {
    file: File;
    progress: SetProgress;
}

async function getPresignedUrl(url: string) {
    const fetch = new FetchBuilder()
        .setUrl(`${url}/api/media/presigned`)
        .setIsGraphQLEndpoint(false)
        .build();
    return await fetch.exec();
}

export function getUploadHandler(url: string) {
    return function uploadFileToMediaLit(
        files: FileWithProgress[],
    ): DelayedPromiseCreator<ImageAttributes>[] {
        invariant(files.length > 0, {
            code: ErrorConstant.EXTENSION,
            message:
                "The upload handler was applied for the image extension without any valid files",
        });

        let completed = 0;
        const promises: DelayedPromiseCreator<ImageAttributes>[] = [];

        for (const { file, progress } of files) {
            promises.push(
                () =>
                    new Promise<ImageAttributes>((resolve, reject) => {
                        if (file.size > 2097152) {
                            // 2 MB (taken from: https://stackoverflow.com/a/49490014)
                            return reject("File is larger than 2MB");
                        }
                        getPresignedUrl(url)
                            .then(({ signature, endpoint }) => {
                                const fD = new FormData();
                                fD.append("caption", file.name);
                                fD.append("access", "public");
                                fD.append("file", file);

                                return fetch(`${endpoint}/media/create`, {
                                    method: "POST",
                                    headers: {
                                        "x-medialit-signature": signature,
                                    },
                                    body: fD,
                                });
                            })
                            .then((data) => data.json())
                            .then((data: Media) => {
                                completed += 1;
                                progress(completed / files.length);
                                resolve({
                                    src: data.file,
                                    fileName: data.originalFileName,
                                });
                            })
                            .catch((err) => reject(err.message));
                    }),
            );
        }
        return promises;
    };
}
