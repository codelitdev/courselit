import React from "react";
import { Grid } from "@mui/material";
import WidgetByName from "./widget-by-name";

interface TemplateProps {
    layout: Record<string, unknown>[];
    editing: boolean;
    onEditClick?: (widgetId: string) => void;
}

const Template = (props: TemplateProps) => {
    const { layout, editing, onEditClick } = props;

    return (
        <Grid container direction="column">
            {layout.map((item: any, index: number) => (
                <Grid
                    item
                    key={item.widgetId}
                    onClick={
                        editing
                            ? () => onEditClick && onEditClick(item.widgetId)
                            : () => {}
                    }
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
