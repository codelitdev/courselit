import {
    PageTypeProduct,
    PageTypeSite,
    PageTypeBlog,
} from "@courselit/common-models";
import { Close } from "@mui/icons-material";
import {
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    Typography,
} from "@mui/material";
import { EDIT_PAGE_ADD_WIDGET_TITLE } from "../../../ui-config/strings";
import widgets from "../../../ui-config/widgets";

interface WidgetsListProps {
    pageType: PageTypeProduct | PageTypeSite | PageTypeBlog;
    onSelection: (...args: any[]) => void;
    onClose: (...args: any[]) => void;
}

function AddWidget({ pageType, onSelection, onClose }: WidgetsListProps) {
    return (
        <Grid container direction="column">
            <Grid item>
                <List>
                    <ListItem>
                        <Grid
                            container
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Grid item>
                                <Typography variant="h6">
                                    {EDIT_PAGE_ADD_WIDGET_TITLE}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <IconButton onClick={onClose}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </ListItem>
                    {Object.keys(widgets)
                        .filter(
                            (widget) => !["header", "footer"].includes(widget)
                        )
                        .map((item, index) =>
                            widgets[item].metadata.compatibleWith.includes(
                                pageType
                            ) ? (
                                <ListItem disablePadding key={index}>
                                    <ListItemButton
                                        onClick={(e) => onSelection(item)}
                                    >
                                        <Typography>
                                            {widgets[item].metadata.displayName}
                                        </Typography>
                                    </ListItemButton>
                                </ListItem>
                            ) : (
                                <></>
                            )
                        )}
                </List>
            </Grid>
        </Grid>
    );
}

export default AddWidget;
