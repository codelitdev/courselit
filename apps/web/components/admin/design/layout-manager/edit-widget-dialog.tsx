import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    useTheme,
} from "@mui/material";
import {
    BUTTON_CANCEL_TEXT,
    DIALOG_DONE_BUTTON,
    DIALOG_EDIT_WIDGET_PREFIX,
} from "../../../../ui-config/strings";
import widgets from "../../../../ui-config/widgets";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";

interface EditWidgetDialogProps {
    onOpen: boolean;
    onClose: (...args: any[]) => void;
    widget: Record<string, unknown>;
    address: Address;
}

const EditWidgeDialog = (props: EditWidgetDialogProps) => {
    const { onClose, onOpen, widget, address } = props;
    const AdminWidget = widgets[widget.name as string].adminWidget;
    const AdminWidgetWithStateAndDispatch: any = connect(
        (state: AppState) => state
    )(AdminWidget);
    const theme = useTheme();
    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);
    let newSettings: Record<string, unknown>;

    const onChange = (settings: Record<string, unknown>) => {
        newSettings = settings;
    };

    const saveSettings = () => {
        widget.settings = newSettings;
        onClose();
    };

    return (
        <Dialog onClose={onClose} open={onOpen}>
            <DialogTitle>{`${DIALOG_EDIT_WIDGET_PREFIX} ${
                widgets[widget.name as string].metadata.displayName
            }`}</DialogTitle>
            <DialogContent>
                <AdminWidgetWithStateAndDispatch
                    settings={widget.settings || {}}
                    onChange={onChange}
                    fetchBuilder={fetch}
                    theme={theme}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{BUTTON_CANCEL_TEXT}</Button>
                <Button onClick={saveSettings}>{DIALOG_DONE_BUTTON}</Button>
            </DialogActions>
        </Dialog>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(EditWidgeDialog);
