"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shadcn-utils";
import { Upload, X } from "lucide-react";
import type React from "react"; // Added import for React

export type MediaType = "image" | "video" | "audio" | "file";

interface MediaUploadProps {
    type?: MediaType;
    value?: string | null;
    onChange?: (value: string | null) => void;
    onRemove?: () => void;
    className?: string;
    disabled?: boolean;
    recommendedSize?: string;
    accept?: string;
}

export function MediaUpload({
    type = "image",
    value,
    onChange,
    onRemove,
    className,
    disabled,
    recommendedSize = "1280x720px",
    accept,
}: MediaUploadProps) {
    const [preview, setPreview] = useState<string | null>(value || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Reset error state
            setError(null);

            // Validate file type
            if (
                accept &&
                !accept.split(",").some((type) => file.type.match(type.trim()))
            ) {
                setError(`Invalid file type. Please upload a ${type} file.`);
                return;
            }

            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreview(url);
            onChange?.(url);

            // Cleanup preview URL when component unmounts
            return () => URL.revokeObjectURL(url);
        },
        [accept, onChange, type],
    );

    const handleRemove = useCallback(() => {
        setPreview(null);
        setError(null);
        onRemove?.();
    }, [onRemove]);

    const getAcceptString = () => {
        if (accept) return accept;
        switch (type) {
            case "image":
                return "image/*";
            case "video":
                return "video/*";
            case "audio":
                return "audio/*";
            default:
                return undefined;
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div
                className={cn(
                    "flex items-center gap-4 rounded-lg border-2 border-dashed p-4",
                    error && "border-destructive",
                    "relative",
                )}
            >
                <div className="h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                    {preview ? (
                        type === "image" ? (
                            <Image
                                src={preview || "/placeholder.svg"}
                                alt="Preview"
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </div>
                        )
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Upload className="h-8 w-8" />
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <div>
                        <input
                            type="file"
                            accept={getAcceptString()}
                            onChange={handleFileChange}
                            className="hidden"
                            id="media-upload"
                            disabled={disabled}
                        />
                        <label htmlFor="media-upload">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="mr-2"
                                asChild
                            >
                                <span>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload{" "}
                                    {type.charAt(0).toUpperCase() +
                                        type.slice(1)}
                                </span>
                            </Button>
                        </label>
                        {preview && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRemove}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                    </div>
                    {recommendedSize && (
                        <p className="text-sm text-muted-foreground">
                            Recommended size: {recommendedSize}
                        </p>
                    )}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
