import React from "react";
import { Address } from "@courselit/common-models";
import widgets from "../../../ui-config/widgets";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Button, Grid, IconButton, Typography, useTheme } from "@mui/material";
import { Close } from "@mui/icons-material";
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
        deleteable: boolean;
    };
}

function EditWidget({ onChange, onClose, onDelete, widget }: EditWidgetProps) {
    const onDeleteWidget = () => {
        onDelete(widget.widgetId);
        onClose();
    };

    return (
        <Grid
            container
            direction="column"
            sx={{
                p: 2,
            }}
        >
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h6">
                            {widgets[widget.name].metadata.displayName}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <IconButton onClick={onClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ mb: 4 }}>
                <AdminWidget
                    id={widget.name}
                    settings={widget.settings || {}}
                    onChange={(e: Record<string, unknown>) => {
                        onChange(widget.widgetId, e);
                    }}
                />
            </Grid>
            {widget.deleteable && (
                <Grid item alignSelf="center">
                    <Button color="error" onClick={onDeleteWidget}>
                        Delete block
                    </Button>
                </Grid>
            )}
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(EditWidget);
