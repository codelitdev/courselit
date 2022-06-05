import React, { useState } from "react";
import { styled } from "@mui/system";
import {
    BUTTON_SELECT_MEDIA,
    DIALOG_TITLE_FEATURED_IMAGE,
} from "../../../../ui-config/strings";
import { Grid, Button, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import { Image } from "@courselit/components-library";

const PREFIX = "MediaSelector";

const classes = {
    preview: `${PREFIX}-preview`,
};

const StyledGrid = styled(Grid)(() => ({
    [`& .${classes.preview}`]: {
        width: 100,
    },
}));

const MediaManagerDialog = dynamic(() => import("./media-manager-dialog"));

interface MediaSelectorProps {
    title: string;
    src: string;
    onSelection: (...args: any[]) => void;
    mimeTypesToShow: string[];
    access: "public" | "private";
}

const MediaSelector = (props: MediaSelectorProps) => {
    const [dialogOpened, setDialogOpened] = useState(false);

    const onSelection = (media: any) => {
        setDialogOpened(!dialogOpened);
        props.onSelection(media);
    };

    return (
        <StyledGrid container direction="row" alignItems="center" spacing={2}>
            <Grid item>
                <Typography variant="body1">{props.title}</Typography>
            </Grid>
            <Grid item className={classes.preview}>
                <Image src={props.src} />
            </Grid>
            <Grid item>
                <Button
                    variant="outlined"
                    onClick={() => setDialogOpened(!dialogOpened)}
                >
                    {BUTTON_SELECT_MEDIA}
                </Button>
            </Grid>
            <MediaManagerDialog
                onOpen={dialogOpened}
                onClose={onSelection}
                title={DIALOG_TITLE_FEATURED_IMAGE}
                mediaAdditionAllowed={false}
                mimeTypesToShow={props.mimeTypesToShow}
                access={props.access}
            />
        </StyledGrid>
    );
};

export default MediaSelector;
