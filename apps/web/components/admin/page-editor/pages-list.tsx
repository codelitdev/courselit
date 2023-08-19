import IconButton from "@mui/material/IconButton";
import { Cross as Close } from "@courselit/icons";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { EDIT_PAGE_HEADER_ALL_PAGES } from "../../../ui-config/strings";

interface PagesListProps {
    pages: { pageId: string; name: string }[];
    onClose: () => void;
}

function PagesList({ pages, onClose }: PagesListProps) {
    return (
        <List>
            <ListItem>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h6">
                            {EDIT_PAGE_HEADER_ALL_PAGES}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <IconButton onClick={onClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Grid>
                </Grid>
            </ListItem>
            {pages.map((page) => (
                <ListItemButton
                    href={`/dashboard/page/${page.pageId}/edit`}
                    key={page.pageId}
                >
                    <ListItemText primary={page.name} />
                </ListItemButton>
            ))}
        </List>
    );
}

export default PagesList;
