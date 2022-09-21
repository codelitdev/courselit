import * as React from "react";
import { ReactNode } from "react";
import {
    Dialog,
    DialogTitle,
    DialogActions,
    Button,
    DialogContent,
} from "@mui/material";

interface Action {
    name: string;
    callback: (...args: any[]) => void;
}

interface AppDialogProps {
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    title: string;
    children?: ReactNode;
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
            {props.children && <DialogContent>{props.children}</DialogContent>}
            {props.actions && <DialogActions>{dialogActions}</DialogActions>}
        </Dialog>
    );
};

export default AppDialog;
