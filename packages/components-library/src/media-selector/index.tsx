import * as React from "react";
import Image from "../image";
import {
    Address,
    AppMessage,
    Auth,
    Media,
    Profile,
} from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import Access from "./access";
import Button from "../button";
import Dialog2 from "../dialog2";
import { FetchBuilder } from "@courselit/utils";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import Form from "../form";
import FormField from "../form-field";

const { useState } = React;

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
}

interface MediaSelectorProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
    title: string;
    src: string;
    srcTitle: string;
    onSelection: (...args: any[]) => void;
    mimeTypesToShow?: string[];
    access?: Access;
    strings: Strings;
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
    const { strings, dispatch, address, src, title, srcTitle } = props;

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

    const uploadToServer = async (presignedUrl: string): Promise<Media> => {
        const fD = new FormData();
        fD.append("caption", uploadData.caption);
        fD.append("access", uploadData.public ? "public" : "private");
        fD.append("file", selectedFile);

        setUploadData(
            Object.assign({}, uploadData, {
                uploading: true,
            }),
        );
        let res: any = await fetch(presignedUrl, {
            method: "POST",
            body: fD,
        });
        if (res.status === 200) {
            const media = await res.json();
            return media;
        } else {
            res = await res.json();
            throw new Error(res.error);
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
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            setUploading(false);
            setDialogOpened(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <h4>{title}</h4>
            <div className="flex flex-col gap-2">
                <Image src={src} height={64} width={64} />
                <p className="text-xs">{srcTitle}</p>
            </div>
            <div>
                <Dialog2
                    title={strings.dialogTitle || "Select media"}
                    trigger={
                        <Button component="button" variant="soft">
                            {strings.buttonCaption || "Select media"}
                        </Button>
                    }
                    open={dialogOpened}
                    onOpenChange={setDialogOpened}
                    okButton={
                        <Button
                            component="button"
                            onClick={uploadFile}
                            disabled={
                                !selectedFile || (selectedFile && uploading)
                            }
                        >
                            {uploading
                                ? strings.uploading || "Uploading"
                                : strings.uploadButtonText || "Upload"}
                        </Button>
                    }
                >
                    {error && <div>{error}</div>}
                    <Form encType="multipart/form-data">
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
                            className="mt-4"
                            required
                        />
                    </Form>
                </Dialog2>
            </div>
        </div>
    );
};

export default MediaSelector;
