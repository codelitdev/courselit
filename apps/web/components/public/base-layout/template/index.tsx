import React, { ReactNode } from "react";
import { Box, Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";
import AppToast from "../../../app-toast";
import { WidgetInstance } from "@courselit/common-models";
import { Footer, Header } from "@courselit/common-widgets";

interface TemplateProps {
    layout: WidgetInstance[];
    editing?: boolean;
    onEditClick?: (widgetId: string) => void;
    selectedWidget?: string;
    children?: ReactNode;
    childrenOnTop: boolean;
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
        childrenOnTop = false,
    } = props;
    if (!layout) return <></>;
    const footer = layout.filter(
        (widget) => widget.name === Footer.metadata.name
    )[0];
    const header = layout.filter(
        (widget) => widget.name === Header.metadata.name
    )[0];

    return (
        <Grid container direction="column">
            {header && (
                <EditableWidget
                    item={header}
                    editing={editing}
                    onEditClick={onEditClick}
                />
            )}
            {childrenOnTop && (
                <>
                    <Grid item sx={{ minHeight: "70vh" }}>
                        {children}
                    </Grid>
                    {layout
                        .filter(
                            (widget) =>
                                ![
                                    Header.metadata.name,
                                    Footer.metadata.name,
                                ].includes(widget.name)
                        )
                        .map((item: any, index: number) => (
                            <EditableWidget
                                item={item}
                                key={item.widgetId}
                                editing={editing}
                                onEditClick={onEditClick}
                            />
                        ))}
                </>
            )}
            {!childrenOnTop && (
                <>
                    {layout
                        .filter(
                            (widget) =>
                                ![
                                    Header.metadata.name,
                                    Footer.metadata.name,
                                ].includes(widget.name)
                        )
                        .map((item: any, index: number) => (
                            <EditableWidget
                                item={item}
                                key={item.widgetId}
                                editing={editing}
                                onEditClick={onEditClick}
                            />
                        ))}
                    <Grid item sx={{ minHeight: "70vh" }}>
                        {children}
                    </Grid>
                </>
            )}
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
