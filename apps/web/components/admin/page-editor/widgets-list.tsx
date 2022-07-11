import { Add, Warning } from "@mui/icons-material";
import {
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    Typography,
} from "@mui/material";
import { EDIT_PAGE_WIDGET_LIST_HEADER } from "../../../ui-config/strings";
import widgets from "../../../ui-config/widgets";

interface WidgetListProps {
    layout: Record<string, unknown>[];
    onItemClick: (widgetId: string) => void;
    onAddNewClick: (...args: any[]) => void;
}

function WidgetList({ layout, onItemClick, onAddNewClick }: WidgetListProps) {
    if (!layout) return <></>;

    return (
        <>
            <List>
                <ListItem>
                    <Typography variant="h6">
                        {EDIT_PAGE_WIDGET_LIST_HEADER}
                    </Typography>
                </ListItem>
                {layout.map((item: any) =>
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
                )}
                <ListItemButton
                    onClick={onAddNewClick}
                    key="add-new"
                    sx={(theme) => ({ color: theme.palette.primary.main })}
                >
                    <Add fontSize="small" sx={{ mr: 1 }} />
                    Add new
                </ListItemButton>
            </List>
        </>
    );
}

export default WidgetList;
