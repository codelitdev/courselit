import React from "react";
import { Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";

interface TemplateProps {
    layout: Record<string, unknown>[];
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
    selectedWidget?: string;
}

const Template = (props: TemplateProps) => {
    const { layout, editing, onEditClick, selectedWidget } = props;

    return (
        <Grid container direction="column">
            {layout.map((item: any, index: number) => (
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
                            // boxShadow: editing
                            //     ? "inset 0 0 0 2px #eee"
                            //     : "none",
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
            ))}
        </Grid>
    );
};

export default Template;
