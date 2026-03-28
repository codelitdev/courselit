import { useState, useRef, useEffect } from "react";
import { Upload as TUSUpload, UploadOptions } from "tus-js-client";

interface UseMediaLitProps {
    signatureEndpoint: string;
    access: any;
    chunkSize?: number;
    onUploadComplete?: (media: Record<string, string>) => void;
    onUploadError?: (error: Error) => void;
}

export function useMediaLit({
    signatureEndpoint,
    access,
    chunkSize,
    onUploadComplete,
    onUploadError,
}: UseMediaLitProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const uploadRef = useRef<TUSUpload | null>(null);

    const getSignature = async (): Promise<{
        signature?: string;
        endpoint?: string;
    }> => {
        const res = await fetch(signatureEndpoint, { method: "POST" });
        if (!res.ok) return {};
        return res.json();
    };

    const uploadFile = (
        fileToUpload: File,
        metadata: Record<string, any> = {},
    ): Promise<Record<string, string>> => {
        setFile(fileToUpload);
        setIsUploading(true);
        setUploadProgress(0);

        return new Promise<Record<string, string>>((resolve, reject) => {
            getSignature()
                .then(({ signature, endpoint }) => {
                    if (!signature || !endpoint) {
                        const err = new Error("Failed to obtain signature");
                        setIsUploading(false);
                        onUploadError?.(err);
                        return reject(err);
                    }

                    const uploadUrl = `${endpoint}/media/create/resumable`;

                    const tusOptions: UploadOptions = {
                        endpoint: uploadUrl,
                        removeFingerprintOnSuccess: true,
                        retryDelays: [0, 3000, 5000],
                        headers: {
                            "x-medialit-signature": signature,
                        },
                        metadata: {
                            fileName: fileToUpload.name,
                            mimeType: fileToUpload.type,
                            access,
                            ...metadata,
                        },
                        onProgress: (bytesUploaded, bytesTotal) => {
                            const percentage =
                                (bytesUploaded / bytesTotal) * 100;
                            setUploadProgress(percentage);
                        },
                        onError: (error) => {
                            setIsUploading(false);
                            onUploadError?.(error);
                            reject(error);
                        },
                        onSuccess: (payload) => {
                            const mediaString =
                                payload.lastResponse.getHeader("Media");
                            const media: Record<string, string> = mediaString
                                ? JSON.parse(mediaString)
                                : null;
                            if (media) {
                                delete media.group;
                                onUploadComplete?.(media);
                                resolve(media);
                            }
                            setIsUploading(false);
                            setUploadProgress(100);
                            setFile(null);
                        },
                    };
                    if (chunkSize) {
                        tusOptions.chunkSize = chunkSize;
                    }

                    const upload = new TUSUpload(fileToUpload, tusOptions);
                    uploadRef.current = upload;

                    upload.findPreviousUploads().then((previous) => {
                        if (previous.length) {
                            upload.resumeFromPreviousUpload(previous[0]);
                        }

                        upload.start();
                    });
                })
                .catch((err) => {
                    setIsUploading(false);
                    onUploadError?.(err);
                    reject(err);
                });
        });
    };

    const abortUpload = () => {
        if (uploadRef.current) {
            uploadRef.current.abort();
            uploadRef.current = null;
        }
        setIsUploading(false);
    };

    useEffect(() => abortUpload, []);

    return {
        file,
        isUploading,
        uploadProgress,
        uploadFile,
        cancelUpload: abortUpload,
    };
}
