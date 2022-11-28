import * as React from "react";
import { Grid, Button, Typography } from "@mui/material";
import Image from "../image";
import MediaManagerDialog from "./media-manager-dialog";
import { Address, Auth, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import Access from "./access";

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
    const { strings, auth, profile, dispatch, address, src, title, srcTitle } =
        props;

    const onSelection = (media: any) => {
        setDialogOpened(!dialogOpened);
        props.onSelection(media);
    };

    return (
        <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid item>
                <Typography variant="body1">{title}</Typography>
            </Grid>
            <Grid item>
                <Grid container direction="column">
                    <Image src={src} height={64} width={64} />
                    <Typography variant="caption">{srcTitle}</Typography>
                </Grid>
            </Grid>
            <Grid item>
                <Button
                    variant="outlined"
                    onClick={() => setDialogOpened(!dialogOpened)}
                >
                    {strings.buttonCaption || "Select media"}
                </Button>
            </Grid>
            {dialogOpened && (
                <MediaManagerDialog
                    auth={auth}
                    profile={profile}
                    dispatch={dispatch}
                    address={address}
                    onOpen={dialogOpened}
                    onClose={onSelection}
                    title={strings.dialogTitle || "Select media"}
                    mediaAdditionAllowed={false}
                    mimeTypesToShow={props.mimeTypesToShow}
                    access={props.access}
                    strings={{
                        cancelCaption: strings.cancelCaption,
                        dialogSelectCaption: strings.dialogSelectCaption,
                        dialogTitle: strings.dialogTitle,
                        header: strings.header,
                        loadMoreText: strings.loadMoreText,
                        editingArea: strings.editingArea,
                        buttonAddFile: strings.buttonAddFile,
                        fileUploaded: strings.fileUploaded,
                        uploadFailed: strings.uploadFailed,
                        uploading: strings.uploading,
                        uploadButtonText: strings.uploadButtonText,
                        headerMediaPreview: strings.headerMediaPreview,
                        originalFileNameHeader: strings.originalFileNameHeader,
                        previewPDFFile: strings.previewPDFFile,
                        directUrl: strings.directUrl,
                        urlCopied: strings.urlCopied,
                        fileType: strings.fileType,
                        changesSaved: strings.changesSaved,
                        mediaDeleted: strings.mediaDeleted,
                        deleteMediaPopupHeader: strings.deleteMediaPopupHeader,
                        popupCancelAction: strings.popupCancelAction,
                        popupOKAction: strings.popupOKAction,
                        deleteMediaButton: strings.deleteMediaButton,
                        publiclyAvailable: strings.publiclyAvailable,
                    }}
                />
            )}
        </Grid>
    );
};

export default MediaSelector;
