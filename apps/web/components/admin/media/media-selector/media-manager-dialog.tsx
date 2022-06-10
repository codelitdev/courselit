import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import MediaGallery from "../index";
import {
    BUTTON_CANCEL_TEXT,
    DIALOG_SELECT_BUTTON,
} from "../../../../ui-config/strings";

interface MediaManagerDialogProps {
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    title: string;
    mediaAdditionAllowed?: boolean;
    mimeTypesToShow: string[];
    access: "public" | "private";
}

const MediaManagerDialog = (props: MediaManagerDialogProps) => {
    const [selectedMedia, setSelectedMedia] = useState();
    const { onClose, onOpen, mimeTypesToShow, access, title } = props;

    const handleSelection = () => onClose(selectedMedia);

    return (
        <Dialog onClose={onClose} open={onOpen} fullWidth={true} maxWidth="lg">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <MediaGallery
                    selectionMode={true}
                    onSelect={(media) => setSelectedMedia(media)}
                    mimeTypesToShow={mimeTypesToShow}
                    access={access}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()}>{BUTTON_CANCEL_TEXT}</Button>
                <Button onClick={handleSelection} disabled={!selectedMedia}>
                    {DIALOG_SELECT_BUTTON}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MediaManagerDialog;
