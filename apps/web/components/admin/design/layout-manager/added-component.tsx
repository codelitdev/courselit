import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Typography, IconButton } from "@mui/material";
import { Delete, Settings } from "@mui/icons-material";
import EditWidgeDialog from "./edit-widget-dialog";
import widgets from "../../../../ui-config/widgets";

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    padding: theme.spacing(1),
    border: "1px solid #eee",
    borderRadius: 8,
    ["&:hover"]: {
        background: "#efefef",
    },
}));

interface AddedComponentProps {
    section: string;
    widget: Record<string, unknown>;
    index: number;
    removeComponent: (...args: any[]) => void;
}

const AddedComponent = (props: AddedComponentProps) => {
    const { widget } = props;
    const [editWidgetDialogOpened, setEditWidgetDialogOpened] = useState(false);

    return (
        <StyledGrid
            container
            item
            direction="row"
            alignItems="center"
            justifyContent="space-between"
        >
            <Grid item>
                <Typography variant="caption">{widget.name}</Typography>
            </Grid>
            <Grid item>
                {widgets[widget.name as string].adminWidget && (
                    <IconButton
                        aria-label="Edit"
                        onClick={() => setEditWidgetDialogOpened(true)}
                    >
                        <Settings />
                    </IconButton>
                )}
                <IconButton
                    color="default"
                    aria-label="remove component"
                    onClick={() =>
                        props.removeComponent(props.section, props.index)
                    }
                    size="large"
                >
                    <Delete />
                </IconButton>
            </Grid>
            {widgets[widget.name as string].adminWidget && (
                <EditWidgeDialog
                    onClose={() => setEditWidgetDialogOpened(false)}
                    onOpen={editWidgetDialogOpened}
                    widget={widget}
                />
            )}
        </StyledGrid>
    );
};

export default AddedComponent;
