import React, { ReactChildren } from "react";
import { Dialog, DialogTitle, DialogActions, Button } from "@mui/material";

interface Action {
    name: string;
    callback: (...args: any[]) => void;
}

interface AppDialogProps {
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    title: string;
    children: ReactChildren;
    actions: Action[];
}

const AppDialog = (props: AppDialogProps) => {
    const { onClose, onOpen } = props;
    const dialogActions = [];

    if (props.actions) {
        for (const action of props.actions) {
            dialogActions.push(
                <Button onClick={action.callback} key={action.name}>
                    {action.name}
                </Button>
            );
        }
    }

    return (
        <Dialog onClose={onClose} open={onOpen}>
            <DialogTitle>{props.title}</DialogTitle>
            {props.children}
            {props.actions && <DialogActions>{dialogActions}</DialogActions>}
        </Dialog>
    );
};

export default AppDialog;
