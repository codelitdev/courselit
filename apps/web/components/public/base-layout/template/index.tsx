import React, { ReactNode } from "react";
import { Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";
import AppToast from "../../../app-toast";

interface TemplateProps {
    layout: Record<string, any>[];
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
    console.log(item);
    return (
        <Grid
            item
            key={item.widgetId}
            onClick={
                editing
                    ? () => onEditClick && onEditClick(item.widgetId)
                    : undefined
            }
            sx={{
                "&:hover": {
                    cursor: editing ? "pointer" : "default",
                },
            }}
        >
            <WidgetByName
                name={item.name}
                section=""
                settings={item.settings || {}}
                id={`widget${item._id}`}
            />
        </Grid>
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
    console.log(layout);
    const footer = layout.filter((widget) => widget.name === "footer")[0];

    return (
        <Grid container direction="column">
            {layout
                .filter((widget) => widget.name !== "footer")
                .map((item: any, index: number) => (
                    <EditableWidget
                        item={item}
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
