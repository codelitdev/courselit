import { Close } from "@mui/icons-material";
import {
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    Typography,
} from "@mui/material";
import widgets from "../../../ui-config/widgets";

interface WidgetsListProps {
    onSelection: (...args: any[]) => void;
    onClose: (...args: any[]) => void;
}

function AddWidget({ onSelection, onClose }: WidgetsListProps) {
    return (
        <Grid container>
            <Grid item>
                <Grid container justifyItems="space-between">
                    <Grid item>New block</Grid>
                    <Grid item>
                        <IconButton onClick={onClose}>
                            <Close />
                        </IconButton>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
                <List>
                    {Object.keys(widgets).map((item, index) => (
                        <ListItem disablePadding key={index}>
                            <ListItemButton onClick={(e) => onSelection(item)}>
                                <Typography>{item}</Typography>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Grid>
        </Grid>
    );
}

export default AddWidget;
