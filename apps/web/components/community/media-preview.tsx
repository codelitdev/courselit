"use client";

import { FileText, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface MediaPreviewProps {
    items: Array<{
        type: "youtube" | "pdf" | "image" | "video";
        url: string;
        title?: string;
        fileSize?: string;
    }>;
    onRemove: (index: number) => void;
}

export function MediaPreview({ items, onRemove }: MediaPreviewProps) {
    if (items.length === 0) return null;

    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex space-x-4 p-4">
                {items.map((item, index) => (
                    <div key={index} className="relative shrink-0">
                        <div className="w-[180px]">
                            <div className="aspect-video w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
                                {item.type === "youtube" && (
                                    <div className="text-4xl">▶️</div>
                                )}
                                {item.type === "pdf" && (
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                )}
                                {item.type === "image" && (
                                    <img
                                        src={item.url}
                                        alt={item.title}
                                        className="object-cover w-full h-full"
                                    />
                                )}
                                {item.type === "video" && (
                                    <Video className="h-10 w-10 text-muted-foreground" />
                                )}
                            </div>
                            <p className="mt-1 text-sm font-medium truncate">
                                {item.title}
                            </p>
                            {item.type === "pdf" && (
                                <p className="text-xs text-muted-foreground">
                                    PDF • {item.fileSize}
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
