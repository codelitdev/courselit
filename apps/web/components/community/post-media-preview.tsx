"use client";

import Image from "next/image";
import { Download, Maximize2, Play } from "lucide-react";
import { CommunityMedia } from "@courselit/common-models";
import { extractVideoId } from "@courselit/utils";

interface CommunityPostMediaPreviewProps {
    media: CommunityMedia;
    renderActualFile?: boolean;
    onRequestFullscreen?: (media: CommunityMedia) => void;
}

export default function CommunityPostMediaPreview({
    media,
    renderActualFile = false,
    onRequestFullscreen,
}: CommunityPostMediaPreviewProps) {
    if (!media) {
        return null;
    }

    switch (media.type) {
        case "image": {
            if (!media.media) {
                return null;
            }

            const isFullscreenViewer = !onRequestFullscreen;
            const imageSrc =
                renderActualFile || media.media.file?.endsWith(".gif")
                    ? media.media.file!
                    : media.media.thumbnail;

            return (
                <div
                    className={
                        renderActualFile
                            ? `relative ${isFullscreenViewer ? "flex h-full w-full items-center justify-center overflow-auto rounded-md" : "group"}`
                            : "relative"
                    }
                >
                    <Image
                        src={imageSrc}
                        alt="Post media"
                        className={
                            renderActualFile
                                ? isFullscreenViewer
                                    ? "h-auto max-h-full w-auto max-w-full rounded-md object-contain"
                                    : "h-48 w-48 rounded-md object-cover"
                                : "h-48 w-48 rounded-md object-cover"
                        }
                        width={isFullscreenViewer ? 1600 : 192}
                        height={isFullscreenViewer ? 1200 : 192}
                    />
                    {renderActualFile &&
                        media.media.file &&
                        onRequestFullscreen && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRequestFullscreen(media);
                                }}
                                className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                                aria-label="View full screen"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        )}
                </div>
            );
        }

        case "gif":
            return (
                <img
                    src={media.url}
                    alt="GIF"
                    className="h-48 w-48 rounded-md object-cover"
                />
            );

        case "video":
            return media.media ? (
                <video
                    src={media.media.file}
                    poster={media.media.thumbnail}
                    className="h-48 aspect-video rounded-md object-cover"
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    Your browser does not support the video tag.
                </video>
            ) : null;

        case "youtube":
            if (renderActualFile) {
                return (
                    <iframe
                        width="100%"
                        height="100%"
                        src={media.url}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                );
            }

            if (!media.url) {
                return null;
            }

            const videoId = extractVideoId(media.url, "youtube");
            if (!videoId) {
                return null;
            }

            return (
                <div className="relative h-48 aspect-video overflow-hidden">
                    <img
                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                        alt="YouTube thumbnail"
                        className="h-full w-full rounded-md object-cover transition-transform duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="relative">
                            <span className="absolute -inset-1.5 animate-pulse rounded-full bg-gray-200/50 duration-[3000ms]"></span>
                            <div className="relative z-1 rounded-full bg-primary p-4 text-primary-foreground">
                                <Play className="h-8 w-8" fill="currentColor" />
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "pdf":
            if (renderActualFile) {
                const isFullscreenViewer = !onRequestFullscreen;

                return (
                    <div
                        className="relative group h-full w-full overflow-hidden rounded-md"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        {!isFullscreenViewer && (
                            <div className="absolute inset-0 z-10" />
                        )}
                        <iframe
                            src={`${media.media?.file}#toolbar=0&view=FitH`}
                            className={`h-full w-full ${isFullscreenViewer ? "" : "pointer-events-none"}`}
                            onContextMenu={(e) => e.preventDefault()}
                        ></iframe>
                        <div
                            className={`absolute right-2 top-2 z-20 flex gap-2 ${isFullscreenViewer ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100"}`}
                        >
                            {media.media?.mediaId && (
                                <a
                                    href={`/api/media/${encodeURIComponent(media.media.mediaId)}`}
                                    className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                                    aria-label="Download"
                                >
                                    <Download className="h-4 w-4" />
                                </a>
                            )}
                            {onRequestFullscreen && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRequestFullscreen(media);
                                    }}
                                    className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                                    aria-label="View full screen"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex h-48 w-36 flex-col justify-between rounded bg-red-500">
                    <div>
                        <div className="ml-1 mt-1 inline-block rounded bg-gray-900 p-1 text-xs text-white">
                            PDF
                        </div>
                    </div>
                    <div className="truncate p-1 text-sm text-white">
                        {media.media?.originalFileName}
                    </div>
                </div>
            );

        default:
            return null;
    }
}
