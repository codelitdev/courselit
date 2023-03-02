import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Alignment, Item } from "../settings";
import { TextRenderer } from "@courselit/components-library";

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
    alignment
}: ItemmProps) {
    console.log(title, buttonBackground, buttonForeground);
    return (
        <Grid
            item
            xs={12}
            md={6}
            sx={{
                mb: 3,
            }}
        >
            <Grid
                item
                container
                direction="column"
                component="article"
                spacing={1}
                alignItems={ alignment === "center" ? "center" : "left" }
            >
                <Grid item>
                    <Typography variant="h5">{title}</Typography>
                </Grid>
                {description && (
                    <Grid item sx={{ textAlign: alignment === "center" ? "center" : "left" }}>
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
