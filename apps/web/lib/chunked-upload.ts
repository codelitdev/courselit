import { Media } from "@courselit/common-models";
import {
    initializeChunkedUpload,
    uploadChunk,
    completeChunkedUpload,
    abortChunkedUpload,
    ChunkedUploadInit,
} from "../services/medialit";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export interface ChunkedUploadProgress {
    uploadedChunks: number;
    totalChunks: number;
    percentage: number;
    uploadedBytes: number;
    totalBytes: number;
}

export interface ChunkedUploadOptions {
    file: File;
    presignedUrl: string;
    access?: string;
    caption?: string;
    group?: string;
    onProgress?: (progress: ChunkedUploadProgress) => void;
    onError?: (error: Error) => void;
    chunkSize?: number;
}

export class ChunkedUploader {
    private file: File;
    private presignedUrl: string;
    private options: ChunkedUploadOptions;
    private uploadId: string | null = null;
    private aborted = false;
    private chunkSize: number;

    constructor(options: ChunkedUploadOptions) {
        this.file = options.file;
        this.presignedUrl = options.presignedUrl;
        this.options = options;
        this.chunkSize = options.chunkSize || CHUNK_SIZE;
    }

    async upload(): Promise<Media> {
        try {
            const totalChunks = Math.ceil(this.file.size / this.chunkSize);

            // Initialize chunked upload
            const initParams: ChunkedUploadInit = {
                fileName: this.file.name,
                fileSize: this.file.size,
                mimeType: this.file.type,
                totalChunks,
                access: this.options.access,
                caption: this.options.caption,
                group: this.options.group,
            };

            const initResponse = await initializeChunkedUpload(
                initParams,
                this.presignedUrl,
            );
            this.uploadId = initResponse.uploadId;

            // Upload chunks
            let uploadedBytes = 0;
            for (
                let chunkNumber = 0;
                chunkNumber < totalChunks;
                chunkNumber++
            ) {
                if (this.aborted) {
                    throw new Error("Upload aborted");
                }

                const start = chunkNumber * this.chunkSize;
                const end = Math.min(start + this.chunkSize, this.file.size);
                const chunk = this.file.slice(start, end);

                await uploadChunk(
                    this.uploadId,
                    chunkNumber,
                    chunk,
                    this.presignedUrl,
                );

                uploadedBytes += chunk.size;

                // Report progress
                if (this.options.onProgress) {
                    const progress: ChunkedUploadProgress = {
                        uploadedChunks: chunkNumber + 1,
                        totalChunks,
                        percentage: Math.round(
                            (uploadedBytes / this.file.size) * 100,
                        ),
                        uploadedBytes,
                        totalBytes: this.file.size,
                    };
                    this.options.onProgress(progress);
                }
            }

            // Complete upload
            const media = await completeChunkedUpload(
                this.uploadId,
                this.presignedUrl,
            );
            return media;
        } catch (error) {
            if (this.uploadId && !this.aborted) {
                try {
                    await abortChunkedUpload(this.uploadId, this.presignedUrl);
                } catch (abortError) {
                    console.error(
                        "Failed to abort chunked upload:",
                        abortError,
                    );
                }
            }

            if (this.options.onError) {
                this.options.onError(error as Error);
            }
            throw error;
        }
    }

    async abort(): Promise<void> {
        this.aborted = true;
        if (this.uploadId) {
            await abortChunkedUpload(this.uploadId, this.presignedUrl);
        }
    }
}

export async function uploadFileInChunks(
    options: ChunkedUploadOptions,
): Promise<Media> {
    const uploader = new ChunkedUploader(options);
    return uploader.upload();
}

export function shouldUseChunkedUpload(
    file: File,
    threshold: number = 10 * 1024 * 1024,
): boolean {
    return file.size > threshold; // Default 10MB threshold
}
