import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { Typeface } from "@courselit/common-models";
import { EDIT_PAGE_BUTTON_FONTS } from "../../../ui-config/strings";
import IconButton from "@mui/material/IconButton";
import Close from "@mui/icons-material/Close";
import Star from "@mui/icons-material/Star";

interface FontListProps {
    draftTypefaces: Typeface[];
    saveDraftTypefaces: (name: string) => void;
    onClose: () => void;
}

function FontsList({
    draftTypefaces,
    saveDraftTypefaces,
    onClose,
}: FontListProps) {
    const fonts = [
        "Roboto",
        "Open Sans",
        "Agdasima",
        "Lato",
        "Montserrat",
        "Poppins",
    ];
    const defaultTypeface = draftTypefaces.filter(
        (x) => x.section === "default"
    )[0]?.typeface;

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
                            {EDIT_PAGE_BUTTON_FONTS}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <IconButton onClick={onClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Grid>
                </Grid>
            </ListItem>
            {fonts.map((font) => (
                <ListItemButton
                    onClick={() => saveDraftTypefaces(font)}
                    key={font}
                >
                    {defaultTypeface === font && (
                        <ListItemIcon>
                            <Star />
                        </ListItemIcon>
                    )}
                    <ListItemText
                        inset={defaultTypeface !== font}
                        primary={font}
                    />
                </ListItemButton>
            ))}
        </List>
    );
}

export default FontsList;
