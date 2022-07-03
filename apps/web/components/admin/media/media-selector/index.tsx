import React, { useState } from "react";
import {
    BUTTON_SELECT_MEDIA,
    DIALOG_TITLE_FEATURED_IMAGE,
} from "../../../../ui-config/strings";
import { Grid, Button, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import { Image } from "@courselit/components-library";

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
        <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid item>
                <Typography variant="body1">{props.title}</Typography>
            </Grid>
            <Grid item>
                <Image src={props.src} height={64} width={64} />
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
        </Grid>
    );
};

export default MediaSelector;
