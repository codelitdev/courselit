import React, { ReactNode } from "react";
import { Box, Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";
import AppToast from "../../../app-toast";
import { WidgetInstance } from "@courselit/common-models";

interface TemplateProps {
    layout: WidgetInstance[];
    editing?: boolean;
    onEditClick?: (widgetId: string) => void;
    selectedWidget?: string;
    children: ReactNode;
}

const EditableWidget = ({
    item,
    editing,
    onEditClick,
}: {
    item: Record<string, any>;
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
}) => {
    if (editing) {
        return (
            <Box
                onClick={() => onEditClick && onEditClick(item.widgetId)}
                sx={{
                    "&:hover": {
                        cursor: editing ? "pointer" : "default",
                    },
                }}
            >
                <WidgetByName
                    name={item.name}
                    settings={item.settings || {}}
                    id={`widget${item._id}`}
                />
            </Box>
        );
    }

    return (
        <WidgetByName
            name={item.name}
            settings={item.settings || {}}
            id={`widget${item._id}`}
        />
    );
};

const Template = (props: TemplateProps) => {
    const {
        layout,
        editing = false,
        onEditClick,
        selectedWidget,
        children,
    } = props;
    if (!layout) return <></>;
    const footer = layout.filter((widget) => widget.name === "footer")[0];

    return (
        <Grid container direction="column">
            {layout
                .filter((widget) => widget.name !== "footer")
                .map((item: any, index: number) => (
                    <EditableWidget
                        item={item}
                        key={item.widgetId}
                        editing={editing}
                        onEditClick={onEditClick}
                    />
                ))}
            {children}
            {footer && (
                <EditableWidget
                    item={footer}
                    editing={editing}
                    onEditClick={onEditClick}
                />
            )}
            <AppToast />
        </Grid>
    );
};

export default Template;
