"use client";

import { useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Upload,
    Package,
    CheckCircle,
    Loader2,
    FileWarning,
} from "lucide-react";
import { useToast, useMediaLit } from "@courselit/components-library";
import { AddressContext } from "@components/contexts";
import { Progress as ShadProgress } from "@/components/ui/progress";
import { ScormContent } from "@courselit/common-models";
import constants from "@config/constants";

interface ScormLessonUploadProps {
    lessonId: string;
    content?: ScormContent;
    onUploadComplete: (content: ScormContent) => void;
}

export function ScormLessonUpload({
    lessonId,
    content,
    onUploadComplete,
}: ScormLessonUploadProps) {
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { uploadFile, isUploading, uploadProgress } = useMediaLit({
        signatureEndpoint: `${address.backend}/api/media/presigned`,
        access: "private",
        onUploadComplete: async (response) => {
            setUploading(false);
            setProcessing(true);

            try {
                const result = await fetch(
                    `${address.backend}/api/lessons/${lessonId}/scorm/upload`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mediaId: response.mediaId }),
                    },
                );

                const data = await result.json();

                if (!result.ok) {
                    throw new Error(
                        data.message || "Failed to process SCORM package",
                    );
                }

                toast({
                    title: "Success",
                    description: "SCORM package uploaded successfully",
                });

                onUploadComplete({
                    mediaId: response.mediaId,
                    launchUrl: data.packageInfo.entryPoint,
                    version: data.packageInfo.version,
                    title: data.packageInfo.title,
                    scoCount: data.packageInfo.scoCount,
                    fileCount: data.packageInfo.fileCount,
                });

                setError(null);
            } catch (err: any) {
                setError(err.message);
                toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setProcessing(false);
            }
        },
        onUploadError: (err) => {
            setUploading(false);
            setError(err.message || "Upload failed");
            toast({
                title: "Upload Failed",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".zip")) {
            setError("Please select a ZIP file");
            return;
        }

        if (file.size > constants.scormPackageSizeLimit) {
            setError(
                `File size must be less than ${constants.scormPackageSizeLimit / 1024 / 1024}MB`,
            );
            return;
        }

        setError(null);
        setUploading(true);
        await uploadFile(file);
    };

    const hasPackage = content?.mediaId;
    const showProgress = uploading || isUploading;

    return (
        <div className="space-y-4">
            <Label className="font-semibold">SCORM Package</Label>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <FileWarning className="h-4 w-4" />
                    {error}
                </div>
            )}

            {hasPackage && (
                <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">
                                    {content?.title || "SCORM Package"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Version {content?.version || "1.2"}
                                    {content?.fileCount &&
                                        ` • ${content.fileCount} files`}
                                </p>
                            </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                </div>
            )}

            {showProgress || processing ? (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {processing
                            ? "Processing SCORM package..."
                            : "Uploading..."}
                    </div>
                    {showProgress && (
                        <ShadProgress value={uploadProgress} className="h-2" />
                    )}
                </div>
            ) : (
                <div>
                    <input
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        id={`scorm-upload-${lessonId}`}
                    />
                    <label htmlFor={`scorm-upload-${lessonId}`}>
                        <Button
                            variant={hasPackage ? "outline" : "default"}
                            className="cursor-pointer"
                            asChild
                        >
                            <span>
                                <Upload className="mr-2 h-4 w-4" />
                                {hasPackage
                                    ? "Replace Package"
                                    : "Upload SCORM Package"}
                            </span>
                        </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                        Upload a SCORM 1.2 or 2004 package (ZIP file, max 500MB)
                    </p>
                </div>
            )}
        </div>
    );
}
