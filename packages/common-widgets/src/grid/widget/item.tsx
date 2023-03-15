import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Item } from "../settings";
import { TextRenderer, Image } from "@courselit/components-library";
import { Alignment } from "@courselit/common-models";

interface ItemmProps {
    item: Item;
    buttonBackground?: string;
    buttonForeground?: string;
    alignment: Alignment;
}

export default function Itemm({
    item: { title, description, buttonAction, buttonCaption, media },
    buttonBackground,
    buttonForeground,
    alignment,
}: ItemmProps) {
    return (
        <Grid
            item
            xs={12}
            md={6}
            lg={4}
            sx={{
                mb: 3,
            }}
        >
            {media && media.file && (
                <Grid item sx={{ mb: 2 }}>
                    <Image
                        src={media && media.file}
                        loading="lazy"
                        sizes="40vw"
                        noDefaultImage={true}
                    />
                </Grid>
            )}
            <Grid
                item
                container
                direction="column"
                component="article"
                spacing={1}
                alignItems={alignment === "center" ? "center" : "left"}
            >
                <Grid item>
                    <Typography variant="h5">{title}</Typography>
                </Grid>
                {description && (
                    <Grid
                        item
                        sx={{
                            textAlign:
                                alignment === "center" ? "center" : "left",
                        }}
                    >
                        <TextRenderer json={description} />
                    </Grid>
                )}
                {buttonAction && buttonCaption && (
                    <Grid item>
                        <Button
                            component="a"
                            href={buttonAction}
                            variant="contained"
                            size="large"
                            sx={{
                                backgroundColor: buttonBackground,
                                color: buttonForeground,
                            }}
                        >
                            {buttonCaption}
                        </Button>
                    </Grid>
                )}
            </Grid>
        </Grid>
    );
}
