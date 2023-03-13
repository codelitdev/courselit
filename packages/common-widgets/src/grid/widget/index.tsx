import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "../settings";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { TextRenderer } from "@courselit/components-library";
import Button from "@mui/material/Button";
import Itemm from "./item";

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        itemsAlignment,
        buttonCaption,
        buttonAction,
        buttonBackground,
        buttonForeground,
        backgroundColor,
        foregroundColor,
        items,
    },
}: WidgetProps<Settings>) {
    return (
        <Grid
            container
            direction="column"
            sx={{
                p: 2,
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <Grid item sx={{ mb: 6 }}>
                <Grid
                    container
                    direction="column"
                    alignItems={
                        headerAlignment === "center" ? "center" : "flex-start"
                    }
                >
                    <Grid item sx={{ mb: 2 }}>
                        <Typography variant="h4">{title}</Typography>
                    </Grid>
                    {description && (
                        <Grid
                            item
                            sx={{
                                mb: 2,
                                textAlign:
                                    headerAlignment === "center"
                                        ? "center"
                                        : "left",
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
            {items && items.length > 0 && (
                <Grid item>
                    <Grid container spacing={2}>
                        {items.map((item: Item, index: number) => (
                            <Itemm
                                item={item}
                                key={index}
                                buttonBackground={buttonBackground}
                                buttonForeground={buttonForeground}
                                alignment={itemsAlignment}
                            />
                        ))}
                    </Grid>
                </Grid>
            )}
        </Grid>
    );
}
