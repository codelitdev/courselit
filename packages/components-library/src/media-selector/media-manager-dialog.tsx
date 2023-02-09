import * as React from "react";
import { useEffect } from "react";
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Checkbox,
    Typography,
    TextField,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import {
    Address,
    AppMessage,
    Auth,
    Media,
    Profile,
} from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import Access from "./access";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";

const { useState } = React;

interface Strings {
    cancelCaption?: string;
    dialogSelectCaption?: string;
    header?: string;
    loadMoreText?: string;
    editingArea?: string;
    dialogTitle?: string;
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

interface MediaManagerDialogProps {
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    title: string;
    mediaAdditionAllowed?: boolean;
    mimeTypesToShow: string[];
    access: Access;
    strings: Strings;
}

const MediaManagerDialog = (props: MediaManagerDialogProps) => {
    // const [selectedMedia, setSelectedMedia] = useState();
    const { onClose, onOpen, access, title, strings, dispatch, address } =
        props;

    const handleSelection = (media: Media) => onClose(media);

    const defaultUploadData = {
        caption: "",
        uploading: false,
        public: access === "public",
    };
    const [uploadData, setUploadData] = useState(defaultUploadData);
    const fileInput: React.RefObject<HTMLInputElement> = React.createRef();
    const [uploading, setUploading] = useState(false);
    const [presignedUrl, setPresignedUrl] = useState("");
    const [error, setError] = useState("");

    const onUploadDataChanged = (e: any) =>
        setUploadData(
            Object.assign({}, uploadData, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? e.target.checked
                        : e.target.value,
            })
        );

    useEffect(() => {
        getPresignedUrl();
    }, []);

    const getPresignedUrl = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
            .build();
        try {
            setUploading(true);
            const response = await fetch.exec();
            setPresignedUrl(response.url);
        } catch (err: any) {
            setError(err.message);
            /*
            dispatch(
                setAppMessage(
                    new AppMessage(
                        err.message
                    )
                )
            );
            */
        } finally {
            setUploading(false);
        }
    };

    const onUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await uploadToServer();
    };

    const uploadToServer = async () => {
        const fD = new FormData();
        fD.append("caption", uploadData.caption);
        fD.append("access", uploadData.public ? "public" : "private");
        fD.append("file", (fileInput as any).current.files[0]);

        setUploadData(
            Object.assign({}, uploadData, {
                uploading: true,
            })
        );

        try {
            setUploading(true);

            let res: any = await fetch(presignedUrl, {
                method: "POST",
                body: fD,
            });
            if (res.status === 200) {
                const media = await res.json();
                handleSelection(media);
            } else {
                res = await res.json();
                throw new Error(res.error);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog
            onClose={() => onClose()}
            open={onOpen}
            fullWidth={true}
            maxWidth="xs"
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {uploading && !presignedUrl && <CircularProgress />}
                {error && <Alert severity="error">{error}</Alert>}
                {presignedUrl && (
                    <form onSubmit={onUpload} encType="multipart/form-data">
                        <Button
                            variant="outlined"
                            component="label"
                            color="primary"
                        >
                            {strings.buttonAddFile || "Select a file"}
                            <input type="file" name="file" ref={fileInput} />
                        </Button>
                        {/*
                    <TextField
                        variant="outlined"
                        label="Alt text"
                        fullWidth
                        margin="normal"
                        name="caption"
                        value={uploadData.caption}
                        onChange={onUploadDataChanged}
                    />
                    <Grid container alignItems="center">
                        <Grid item>
                            <Typography variant="body1">
                                {strings.publiclyAvailable ||
                                    "Publicly available"}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Checkbox
                                name="public"
                                checked={uploadData.public}
                                disabled={true}
                            />
                        </Grid>
                    </Grid>
                    */}
                    </form>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()}>
                    {strings.cancelCaption || "Cancel"}
                </Button>
                {presignedUrl && (
                    <Button disabled={uploading} onClick={onUpload}>
                        {uploading
                            ? strings.uploading || "Uploading..."
                            : strings.uploadButtonText || "Upload"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default MediaManagerDialog;
