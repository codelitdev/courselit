import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    Button,
    ListItemText,
} from "@mui/material";
import {
    DIALOG_SELECT_BUTTON,
    BUTTON_CANCEL_TEXT,
} from "../../../../ui-config/strings";
import CompatibleComponentsMap from "./compatible-components-map";
import CompatibleComponentsMapModel from "../../../../ui-models/compatible-components-map";

interface AddComponentDialogProps {
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    title: string;
    showComponentsCompatibleWith: keyof CompatibleComponentsMapModel;
}

const AddComponentDialog = (props: AddComponentDialogProps) => {
    const { onClose, onOpen, showComponentsCompatibleWith } = props;
    const [selectedComponentName, setSelectedComponentName] = useState("");

    const handleSelection = () => {
        onClose(showComponentsCompatibleWith, selectedComponentName);
        setSelectedComponentName("");
    };

    const closeDialog = () => {
        setSelectedComponentName("");
        onClose("");
    };

    return (
        <Dialog onClose={closeDialog} open={onOpen}>
            <DialogTitle>{props.title}</DialogTitle>
            <DialogContent>
                <List>
                    {CompatibleComponentsMap[showComponentsCompatibleWith] &&
                        CompatibleComponentsMap[
                            showComponentsCompatibleWith
                        ].map((item, index) => (
                            <ListItem
                                key={index}
                                onClick={() => {
                                    setSelectedComponentName(item[0]);
                                }}
                                button
                            >
                                <ListItemText primary={item[1]} />
                            </ListItem>
                        ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeDialog}>{BUTTON_CANCEL_TEXT}</Button>
                <Button
                    onClick={handleSelection}
                    disabled={!selectedComponentName}
                >
                    {DIALOG_SELECT_BUTTON}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddComponentDialog;
