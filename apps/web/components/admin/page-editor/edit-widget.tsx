import React, { useCallback, useState } from "react";
import { Address } from "@courselit/common-models";
import widgets from "../../../ui-config/widgets";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Button, Grid, IconButton, Typography } from "@mui/material";
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
    const [deleteUnderProgress, setDeleteUnderProgress] = useState(false);
    const actualWidget = widgets[widget.name];

    const onDeleteWidget = () => {
        if (deleteUnderProgress) {
            onDelete(widget.widgetId);
            onClose();
        } else {
            setDeleteUnderProgress(true);
        }
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
                            {actualWidget && actualWidget.metadata.displayName}
                            {!actualWidget && widget.name}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <IconButton onClick={onClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Grid>
                </Grid>
            </Grid>
            {actualWidget && (
                <>
                    <Grid item>
                        <AdminWidget
                            name={widget.name}
                            settings={widget.settings || {}}
                            onChange={(e: Record<string, unknown>) => {
                                console.log(e);
                                onChange(widget.widgetId, e);
                            }}
                        />
                    </Grid>
                    <Grid item>
                        <Grid
                            container
                            justifyContent={
                                widget.deleteable ? "space-between" : "flex-end"
                            }
                        >
                            {widget.deleteable && (
                                <Grid item>
                                    <Button
                                        color="error"
                                        onClick={onDeleteWidget}
                                    >
                                        {deleteUnderProgress
                                            ? "Sure?"
                                            : "Delete block"}
                                    </Button>
                                </Grid>
                            )}
                            <Grid item justifyItems="flex-end">
                                <Button onClick={onClose}>Done</Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </>
            )}
            {!actualWidget && <Typography>{widget.name} not found</Typography>}
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(EditWidget);
