import * as React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import MediaGallery from "../media-manager/index";
import { Address, Auth, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

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
    access: "public" | "private";
    strings: Strings;
}

const MediaManagerDialog = (props: MediaManagerDialogProps) => {
    const [selectedMedia, setSelectedMedia] = useState();
    const {
        onClose,
        onOpen,
        mimeTypesToShow,
        access,
        title,
        strings,
        auth,
        profile,
        dispatch,
        address,
    } = props;

    const handleSelection = () => onClose(selectedMedia);

    return (
        <Dialog onClose={onClose} open={onOpen} fullWidth={true} maxWidth="lg">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <MediaGallery
                    auth={auth}
                    profile={profile}
                    dispatch={dispatch}
                    address={address}
                    selectionMode={true}
                    onSelect={(media) => setSelectedMedia(media)}
                    mimeTypesToShow={mimeTypesToShow}
                    access={access}
                    strings={{
                        header: strings.header,
                        loadMoreText: strings.loadMoreText,
                        editingArea: strings.editingArea,
                        dialogTitle: strings.dialogTitle,
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
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()}>
                    {strings.cancelCaption || "Cancel"}
                </Button>
                <Button onClick={handleSelection} disabled={!selectedMedia}>
                    {strings.dialogSelectCaption || "Select"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MediaManagerDialog;
