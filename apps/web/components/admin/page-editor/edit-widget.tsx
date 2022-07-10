import React from "react";
import { Address } from "@courselit/common-models";
import widgets from "../../../ui-config/widgets";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Grid, IconButton, useTheme } from "@mui/material";
import { Close, Delete } from "@mui/icons-material";
import AdminWidget from "./admin-widget";

interface EditWidgetProps {
    address: Address;
    onChange: (widgetId: string, settings: Record<string, unknown>) => void;
    onClose: (...args: any[]) => void;
    onDelete: (widgetId: string) => void;
    widget: {
        name: string;
        settings?: Record<string, unknown>;
        widgetId: string;
    };
}

function EditWidget({
    address,
    onChange,
    onClose,
    onDelete,
    widget,
}: EditWidgetProps) {
    const onDeleteWidget = () => {
        onDelete(widget.widgetId);
        onClose();
    };

    return (
        <Grid container>
            <Grid item>
                <Grid container justifyItems="space-between">
                    <Grid item>
                        {widgets[widget.name].metadata.displayName}
                    </Grid>
                    <Grid item>
                        <IconButton onClick={onDeleteWidget}>
                            <Delete />
                        </IconButton>
                        <IconButton onClick={onClose}>
                            <Close />
                        </IconButton>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
                <AdminWidget
                    id={widget.name}
                    settings={widget.settings || {}}
                    onChange={(e: Record<string, unknown>) => {
                        onChange(widget.widgetId, e);
                    }}
                />
            </Grid>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(EditWidget);
