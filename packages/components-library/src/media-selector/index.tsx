"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Image } from "../image";
import { Address, Media, Profile } from "@courselit/common-models";
import Access from "./access";
import Dialog2 from "../dialog2";
import { FetchBuilder } from "@courselit/utils";
import Form from "../form";
import FormField from "../form-field";
import React from "react";
import {
    Button2,
    PageBuilderPropertyHeader,
    Tooltip,
    uploadFileInChunks,
    useToast,
} from "..";
import { X } from "lucide-react";

interface Strings {
    buttonCaption?: string;
    dialogTitle?: string;
    cancelCaption?: string;
    dialogSelectCaption?: string;
    header?: string;
    loadMoreText?: string;
    editingArea?: string;
    buttonAddFile?: string;
    fileUploaded?: string;
    uploadFailed?: string;
    uploading?: string;
    uploadButtonText?: string;
    headerMediaPreview?: string;
    originalFileNameHeader?: string;
    previewPDFFile?: string;
    directUrl?: string;
    urlCopied?: string;
    fileType?: string;
    changesSaved?: string;
    mediaDeleted?: string;
    deleteMediaPopupHeader?: string;
    popupCancelAction?: string;
    popupOKAction?: string;
    deleteMediaButton?: string;
    publiclyAvailable?: string;
    removeButtonCaption?: string;
}

interface MediaSelectorProps {
    profile: Profile;
    onError?: (err: Error) => void;
    address: Address;
    title: string;
    src: string;
    srcTitle: string;
    onSelection: (...args: any[]) => void;
    onRemove?: (...args: any[]) => void;
    mimeTypesToShow?: string[];
    access?: Access;
    strings: Strings;
    mediaId?: string;
    type: "course" | "lesson" | "page" | "user" | "domain" | "community";
    hidePreview?: boolean;
    tooltip?: string;
    disabled?: boolean;
}

const MediaSelector = (props: MediaSelectorProps) => {
    const [dialogOpened, setDialogOpened] = useState(false);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const defaultUploadData = {
        caption: "",
        uploading: false,
        public: props.access === "public",
    };
    const [uploadData, setUploadData] = useState(defaultUploadData);
    const fileInput: React.RefObject<HTMLInputElement> = React.createRef();
    const [selectedFile, setSelectedFile] = useState<File | undefined>();
    const [caption, setCaption] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const { toast } = useToast();
    const {
        strings,
        address,
        src,
        title,
        srcTitle,
        tooltip,
        disabled = false,
        onError = (err: Error) => {
            toast({
                title: "Error",
                description: `Media upload: ${err.message}`,
                variant: "destructive",
            });
        },
    } = props;

    const onSelection = (media: Media) => {
        props.onSelection(media);
    };

    const getPresignedUrl = async (chunked = false) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
            .setPayload(JSON.stringify({ chunked }))
            .setHeaders({ "Content-Type": "application/json" })
            .build();
        const response = await fetch.exec();
        return response.url;
    };

    useEffect(() => {
        if (!dialogOpened) {
            setSelectedFile(undefined);
            setCaption("");
        }
    }, [dialogOpened]);

    const uploadToServer = async (presignedUrl: string): Promise<Media> => {
        const file = selectedFile;
        if (!file) {
            throw new Error("No file selected");
        }

        const access = uploadData.public ? "public" : "private";

        setUploadData(
            Object.assign({}, uploadData, {
                uploading: true,
            }),
        );

        // Get a chunked presigned URL with longer validity
        const chunkedPresignedUrl = await getPresignedUrl(true);

        return uploadFileInChunks({
            file,
            presignedUrl: chunkedPresignedUrl,
            access,
            caption: uploadData.caption || caption,
            onProgress: (progress) => {
                setUploadProgress(progress.percentage);
            },
            onError: (error) => {
                console.error("Chunked upload error:", error);
            },
        });
    };

    const uploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const file = selectedFile;

        if (!file) {
            setError("File is required");
            return;
        }

        try {
            setUploading(true);
            const presignedUrl = await getPresignedUrl();
            const media = await uploadToServer(presignedUrl);
            onSelection(media);
        } catch (err: any) {
            onError(err);
        } finally {
            setUploading(false);
            setSelectedFile(undefined);
            setCaption("");
            setUploadProgress(0);
            setDialogOpened(false);
        }
    };

    const removeFile = async () => {
        try {
            setUploading(true);
            const fetch = new FetchBuilder()
                .setUrl(
                    `${address.backend}/api/media/${props.mediaId}/${props.type}`,
                )
                .setHttpMethod("DELETE")
                .setIsGraphQLEndpoint(false)
                .build();
            const response = await fetch.exec();
            if (response.message !== "success") {
                throw new Error(response.message);
            }
            if (props.onRemove) {
                props.onRemove();
            }
        } catch (err: any) {
            onError(err);
        } finally {
            setUploading(false);
            setDialogOpened(false);
        }
    };

    return (
        <div className="">
            <PageBuilderPropertyHeader label={title} tooltip={tooltip} />
            <div className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 relative">
                {!props.hidePreview && (
                    <div className="flex flex-col gap-2 items-center">
                        <Image
                            src={src}
                            width="w-[80px]"
                            height="h-[80px]"
                            className="rounded-md"
                        />
                        <Tooltip title={srcTitle}>
                            <p className="text-xs w-12 truncate text-muted-foreground">
                                {srcTitle}
                            </p>
                        </Tooltip>
                    </div>
                )}
                {props.mediaId && (
                    <Button2
                        onClick={removeFile}
                        disabled={uploading || disabled}
                        size="sm"
                        variant="outline"
                    >
                        <X className="mr-2 h-4 w-4" />
                        {uploading
                            ? "Working..."
                            : strings.removeButtonCaption || "Remove"}
                    </Button2>
                )}
                {!props.mediaId && (
                    <div>
                        <Dialog2
                            title={strings.dialogTitle || "Select media"}
                            trigger={
                                <Button2
                                    size="sm"
                                    variant="secondary"
                                    disabled={disabled}
                                >
                                    {strings.buttonCaption || "Select media"}
                                </Button2>
                            }
                            open={dialogOpened}
                            onOpenChange={setDialogOpened}
                            okButton={
                                <Button2
                                    onClick={uploadFile as any}
                                    disabled={!selectedFile || uploading}
                                >
                                    {uploading
                                        ? strings.uploading || "Uploading"
                                        : strings.uploadButtonText || "Upload"}
                                </Button2>
                            }
                        >
                            {error && <div>{error}</div>}
                            <Form
                                encType="multipart/form-data"
                                className="flex flex-col gap-4"
                                onSubmit={uploadFile}
                            >
                                <FormField
                                    label={""}
                                    ref={fileInput}
                                    type="file"
                                    accept={props.mimeTypesToShow?.join(",")}
                                    onChange={(e: any) =>
                                        setSelectedFile(e.target.files[0])
                                    }
                                    messages={[
                                        {
                                            match: "valueMissing",
                                            text: "File is required",
                                        },
                                    ]}
                                    disabled={selectedFile && uploading}
                                    className="mt-2"
                                    required
                                />
                                {uploading && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Upload Progress</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${uploadProgress}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <FormField
                                    label={"Caption"}
                                    name="caption"
                                    value={caption}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => setCaption(e.target.value)}
                                    multiline
                                    rows={5}
                                    disabled={selectedFile && uploading}
                                />
                            </Form>
                        </Dialog2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaSelector;
