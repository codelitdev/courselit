import React from "react";
import { Add, Warning } from "@mui/icons-material";
import { List, ListItem, ListItemButton, Typography } from "@mui/material";
import { EDIT_PAGE_WIDGET_LIST_HEADER } from "../../../ui-config/strings";
import widgets from "../../../ui-config/widgets";

interface WidgetListProps {
    layout: Record<string, unknown>[];
    onItemClick: (widgetId: string) => void;
    onAddNewClick: (...args: any[]) => void;
}

function WidgetItem({
    item,
    onItemClick,
}: {
    item: Record<string, unknown>;
    onItemClick: (widgetId: string) => void;
}) {
    return widgets[item.name] ? (
        <ListItemButton
            onClick={() => onItemClick(item.widgetId)}
            key={item.widgetId}
        >
            {widgets[item.name].metadata.displayName}
        </ListItemButton>
    ) : (
        <ListItem sx={{ color: "red" }}>
            <Warning fontSize="small" sx={{ mr: 1 }} /> {item.name} not found
        </ListItem>
    );
}

function WidgetList({ layout, onItemClick, onAddNewClick }: WidgetListProps) {
    if (!layout.length) return <></>;

    const listItems = [];
    for (let i = 0; i < layout.length - 1; i++) {
        const item = layout[i];
        listItems.push(
            <WidgetItem
                item={item}
                onItemClick={onItemClick}
                key={item.widgetId as string}
            />
        );
    }
    const footer = layout[layout.length - 1];

    return (
        <>
            <List>
                <ListItem>
                    <Typography variant="h6">
                        {EDIT_PAGE_WIDGET_LIST_HEADER}
                    </Typography>
                </ListItem>

                {/* {localLayout.map((item: any) =>
                    widgets[item.name] ? (
                        <ListItemButton
                            onClick={() => onItemClick(item.widgetId)}
                            key={item.widgetId}
                        >
                            {widgets[item.name].metadata.displayName}
                        </ListItemButton>
                    ) : (
                        <ListItem sx={{ color: "red" }}>
                            <Warning fontSize="small" sx={{ mr: 1 }} />{" "}
                            {item.name} not found
                        </ListItem>
                    )
                )} */}
                {listItems}
                <ListItemButton
                    onClick={onAddNewClick}
                    key="add-new"
                    sx={(theme) => ({ color: theme.palette.primary.main })}
                >
                    <Add fontSize="small" sx={{ mr: 1 }} />
                    Add new
                </ListItemButton>
                <WidgetItem item={footer} onItemClick={onItemClick} />
            </List>
        </>
    );
}

export default WidgetList;
