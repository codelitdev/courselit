"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Image from "../image";
import { Address, Media, Profile } from "@courselit/common-models";
import Access from "./access";
import Dialog2 from "../dialog2";
import { FetchBuilder } from "@courselit/utils";
import Form from "../form";
import FormField from "../form-field";
import React from "react";
import { Button2, PageBuilderPropertyHeader, Tooltip } from "..";

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
    type: "course" | "lesson" | "page" | "user" | "domain";
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
    const [selectedFile, setSelectedFile] = useState();
    const [caption, setCaption] = useState("");
    const {
        strings,
        address,
        src,
        title,
        srcTitle,
        tooltip,
        disabled = false,
        onError,
    } = props;

    const onSelection = (media: Media) => {
        props.onSelection(media);
    };

    const getPresignedUrl = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
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
        const fD = new FormData();
        fD.append("caption", (uploadData.caption = caption));
        fD.append("access", uploadData.public ? "public" : "private");
        fD.append("file", selectedFile);

        setUploadData(
            Object.assign({}, uploadData, {
                uploading: true,
            }),
        );
        const res = await fetch(presignedUrl, {
            method: "POST",
            body: fD,
        });
        if (res.status === 200) {
            const media = await res.json();
            if (media) {
                delete media.group;
            }
            return media;
        } else {
            const resp = await res.json();
            throw new Error(resp.error);
        }
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
            onError && onError(err);
        } finally {
            setUploading(false);
            setSelectedFile(undefined);
            setCaption("");
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
            onError && onError(err);
        } finally {
            setUploading(false);
            setDialogOpened(false);
        }
    };

    return (
        <div className="">
            <PageBuilderPropertyHeader label={title} tooltip={tooltip} />
            <div className="flex items-center gap-2">
                {!props.hidePreview && (
                    <div className="flex flex-col gap-2 items-center">
                        <Image
                            src={src}
                            width="w-[32px]"
                            height="h-[32px]"
                            className="rounded-md"
                        />
                        <Tooltip title={srcTitle}>
                            <p className="text-xs w-12 truncate">{srcTitle}</p>
                        </Tooltip>
                    </div>
                )}
                {props.mediaId && (
                    <Button2
                        onClick={removeFile}
                        disabled={uploading || disabled}
                        size="sm"
                        variant="secondary"
                    >
                        {uploading
                            ? "Working..."
                            : strings.removeButtonCaption || "Remove media"}
                    </Button2>
                )}
            </div>
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
                                disabled={
                                    !selectedFile || (selectedFile && uploading)
                                }
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
                            <FormField
                                label={"Caption"}
                                name="caption"
                                value={caption}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setCaption(e.target.value)
                                }
                                multiline
                                rows={5}
                                disabled={selectedFile && uploading}
                            />
                        </Form>
                    </Dialog2>
                </div>
            )}
        </div>
    );
};

export default MediaSelector;
