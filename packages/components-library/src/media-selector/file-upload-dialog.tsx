import type React from "react";

import { useState, useRef } from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { FetchBuilder } from "@courselit/utils";
import { Address, Media } from "@courselit/common-models";
import { useToast } from "@/hooks/use-toast";
import Access from "./access";
import { Upload as TUSUpload } from "tus-js-client";
import MediaType from "./type";
import { AlertDialogAction } from "@radix-ui/react-alert-dialog";

interface FileUploadAlertDialogProps {
    acceptedMimeTypes?: string[];
    disabled?: boolean;
    address: Address;
    access: Access;
    type: MediaType;
    onSuccess: (media: Media) => void;
    open: boolean;
    setOpen: (value: boolean) => void;
}

export function FileUploadAlertDialog({
    acceptedMimeTypes = [],
    disabled = false,
    address,
    access,
    type,
    onSuccess,
    open,
    setOpen,
}: FileUploadAlertDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const uploadRef = useRef<TUSUpload>(null);

    const isValidMimeType = (mimeType: string): boolean => {
        if (acceptedMimeTypes.length === 0) return true;
        return acceptedMimeTypes.includes(mimeType);
    };

    const handleFileValidation = (selectedFile: File) => {
        if (!isValidMimeType(selectedFile.type)) {
            setFileError(
                `Invalid file type. Accepted types: ${acceptedMimeTypes.join(", ")}`,
            );
            setFile(null);
            return;
        }
        setFileError("");
        setFile(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleFileValidation(droppedFiles[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileValidation(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (file) {
            setIsUploading(true);
            setUploadProgress(0);

            try {
                const { signature, endpoint } = await getSignature();

                if (!signature || !endpoint) {
                    toast({
                        title: "Error",
                        description: "Failed to get signature",
                        variant: "destructive",
                    });
                }
                const uploadUrl = `${endpoint}/media/create/resumable`;
                const metadata = {
                    fileName: file.name,
                    mimeType: file.type,
                    access,
                    caption: caption || "",
                };
                const upload = new TUSUpload(file, {
                    endpoint: uploadUrl,
                    // chunkSize: 1024000, // 10 MB
                    removeFingerprintOnSuccess: true,
                    retryDelays: [0, 3000, 5000],
                    headers: {
                        "x-medialit-signature": signature,
                    },
                    metadata,
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = (bytesUploaded / bytesTotal) * 100;
                        setUploadProgress(percentage);
                    },
                    onError: (error) => {
                        toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive",
                        });
                        setIsUploading(false);
                    },
                    onSuccess: async (payload) => {
                        const mediaString =
                            payload.lastResponse.getHeader("Media");
                        const media: Media = mediaString
                            ? JSON.parse(mediaString)
                            : null;
                        if (media) {
                            media && onSuccess(media);

                            setOpen(false);
                            setFile(null);
                            setCaption("");
                            setUploadProgress(0);
                            setIsUploading(false);
                        }
                    },
                });
                uploadRef.current = upload;

                upload.findPreviousUploads().then(function (previousUploads) {
                    if (previousUploads.length) {
                        upload.resumeFromPreviousUpload(previousUploads[0]);
                    }

                    upload.start();
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
                setIsUploading(false);
            }
        }
    };

    const getMedia = async (mediaId: string) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/${mediaId}/${type}`)
            .setHttpMethod("GET")
            .setIsGraphQLEndpoint(false)
            .build();
        return await fetch.exec();
    };

    const handleReset = () => {
        if (uploadRef.current) {
            uploadRef.current.abort();
            uploadRef.current = null;
        }
        setFile(null);
        setCaption("");
        setUploadProgress(0);
        setFileError("");
        setOpen(false);
        setIsUploading(false);
    };

    const getSignature = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
            .build();
        return await fetch.exec();
    };

    const acceptAttribute =
        acceptedMimeTypes.length > 0 ? acceptedMimeTypes.join(",") : undefined;

    return (
        <AlertDialog open={open}>
            <AlertDialogTrigger asChild>
                <Button
                    className="w-full"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                >
                    Upload file
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Upload File</AlertDialogTitle>
                    <AlertDialogDescription>
                        Drag and drop your file or click to browse
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-all duration-200 ${
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        } ${file ? "bg-primary/5" : ""} ${fileError ? "border-destructive bg-destructive/5" : ""}`}
                        style={{ pointerEvents: isUploading ? "none" : "auto" }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            aria-label="File input"
                            disabled={isUploading}
                            accept={acceptAttribute}
                        />
                        <Upload
                            className={`mb-2 h-6 w-6 ${
                                fileError
                                    ? "text-destructive"
                                    : isDragging || file
                                      ? "text-primary"
                                      : "text-muted-foreground"
                            }`}
                        />
                        <p
                            className={`text-sm font-medium ${
                                fileError
                                    ? "text-destructive"
                                    : isDragging || file
                                      ? "text-primary"
                                      : "text-muted-foreground"
                            }`}
                        >
                            {file ? file.name : "Drop file here or click"}
                        </p>
                        {file && !fileError && (
                            <p className="mt-1 text-xs text-muted-foreground">{`Selected: ${(file.size / 1024).toFixed(2)} KB`}</p>
                        )}
                        {fileError && (
                            <p className="mt-2 text-xs text-destructive">
                                {fileError}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Caption (optional)
                        </label>
                        <Input
                            placeholder="Add a caption to your file..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="resize-none"
                            disabled={isUploading}
                        />
                    </div>

                    {isUploading && (
                        <div className="space-y-3 rounded-lg border border-muted bg-muted/30 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                    <Upload className="mt-1 h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            {file?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {Math.round(uploadProgress)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    {isUploading ? (
                        <AlertDialogCancel
                            onClick={() => {
                                if (uploadRef.current) {
                                    uploadRef.current.abort();
                                    uploadRef.current = null;
                                }
                                setIsUploading(false);
                                // setUploadProgress(0);
                            }}
                            disabled={Math.round(uploadProgress) > 99}
                        >
                            {Math.round(uploadProgress) > 99
                                ? "Processing..."
                                : "Cancel"}
                        </AlertDialogCancel>
                    ) : (
                        <>
                            <AlertDialogCancel onClick={handleReset}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button
                                    disabled={!file || !!fileError}
                                    onClick={handleUpload}
                                >
                                    Upload
                                </Button>
                            </AlertDialogAction>
                        </>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
