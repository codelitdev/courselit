"use client";

import { memo } from "react";
import { FileText, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type MediaItem } from "./media-item";

interface MediaPreviewProps {
    items: MediaItem[];
    onRemove: (index: number) => void;
}

function MediaPreviewComponent({ items, onRemove }: MediaPreviewProps) {
    if (items.length === 0) return null;

    const getItemKey = (item: MediaItem) =>
        item.clientId ||
        item.media?.mediaId ||
        (item.url ? `${item.type}:${item.url}` : undefined) ||
        (item.title ? `${item.type}:${item.title}` : undefined);

    const getPreviewSrc = (item: MediaItem) =>
        item.url || item.media?.thumbnail || item.media?.file;

    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex space-x-4 p-4">
                {items.map((item, index) => (
                    <div
                        key={getItemKey(item) || `${item.type}:${index}`}
                        className="relative shrink-0"
                    >
                        <div className="w-[180px]">
                            <div className="aspect-video w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
                                {item.type === "youtube" && (
                                    <div className="text-4xl">▶️</div>
                                )}
                                {item.type === "pdf" && (
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                )}
                                {item.type === "image" &&
                                    (getPreviewSrc(item) ? (
                                        <img
                                            src={getPreviewSrc(item)}
                                            alt={item.title}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <FileText className="h-10 w-10 text-muted-foreground" />
                                    ))}
                                {item.type === "video" && (
                                    <Video className="h-10 w-10 text-muted-foreground" />
                                )}
                                {item.type === "gif" &&
                                    (getPreviewSrc(item) ? (
                                        <img
                                            src={getPreviewSrc(item)}
                                            alt={item.title}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <FileText className="h-10 w-10 text-muted-foreground" />
                                    ))}
                            </div>
                            <p className="mt-1 text-sm font-medium truncate">
                                {item.title}
                            </p>
                            {item.type === "pdf" && (
                                <p className="text-xs text-muted-foreground">
                                    PDF •{" "}
                                    {item.fileSize ||
                                        (item.media?.size
                                            ? `${(item.media.size / (1024 * 1024)).toFixed(1)}mb`
                                            : "")}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-md hover:bg-background"
                            onClick={() => onRemove(index)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}

export const MediaPreview = memo(MediaPreviewComponent);
