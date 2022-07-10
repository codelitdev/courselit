import {
    Button,
    List,
    ListItem,
    ListItemButton,
    Typography,
} from "@mui/material";

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
                {layout.map((item: any) => (
                    <ListItemButton
                        onClick={() => onItemClick(item.widgetId)}
                        key={item.widgetId}
                    >
                        {item.name}
                    </ListItemButton>
                ))}
                <ListItemButton onClick={onAddNewClick} key="add-new">
                    Add new
                </ListItemButton>
            </List>
        </>
    );
}

export default WidgetList;
