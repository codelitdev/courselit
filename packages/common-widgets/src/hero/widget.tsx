import React from "react";
import { WidgetProps } from "@courselit/common-models";
import {
    Box,
    Button,
    Grid,
    GridDirection,
    styled,
    Typography,
} from "@mui/material";
import Settings from "./settings";
import { Image } from "@courselit/components-library";

const Iframe = styled("iframe")({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
});

export default function Widget({
    settings: {
        title,
        description,
        buttonCaption,
        buttonAction,
        mediaId,
        youtubeLink,
        alignment = "left",
        backgroundColor,
        foregroundColor,
        buttonBackground,
        buttonForeground,
        style = "normal",
    },
}: WidgetProps<Settings>) {
    const hasHeroGraphic = youtubeLink || mediaId;
    let direction: GridDirection;
    switch (alignment) {
        case "left":
            direction = "row";
            break;
        case "right":
            direction = "row-reverse";
            break;
        default:
            direction = "row";
    }

    return (
        <Box
            sx={{
                p: style === "card" ? 2 : 0,
            }}
        >
            <Grid
                container
                justifyContent="space-between"
                direction={direction}
                alignItems="center"
                sx={{
                    backgroundColor:
                        style === "card"
                            ? backgroundColor || "#eee"
                            : backgroundColor,
                    color: foregroundColor,
                    p: 2,
                    borderRadius: style === "card" ? 2 : 0,
                }}
            >
                {hasHeroGraphic && (
                    <Grid
                        item
                        md={6}
                        xs={12}
                        sx={{
                            mb: {
                                xs: 2,
                                md: 0,
                            },
                            pr: {
                                xs: 0,
                                md:
                                    hasHeroGraphic && alignment === "left"
                                        ? 1
                                        : 0,
                            },
                            pl: {
                                xs: 0,
                                md:
                                    hasHeroGraphic && alignment === "right"
                                        ? 1
                                        : 0,
                            },
                        }}
                    >
                        {youtubeLink && (
                            <Box
                                sx={{
                                    position: "relative",
                                    paddingBottom: "56.25%",
                                }}
                            >
                                <Iframe
                                    src={`https://www.youtube.com/embed/${youtubeLink}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </Box>
                        )}
                        {!youtubeLink && mediaId && (
                            <Grid
                                item
                                xs={12}
                                md={6}
                                sx={{ p: 2, textAlign: "center", width: 1 }}
                            >
                                <Image
                                    src={mediaId}
                                    width={1}
                                    height={{
                                        xs: 224,
                                        sm: 352,
                                        md: 214,
                                        lg: 286,
                                    }}
                                />
                            </Grid>
                        )}
                    </Grid>
                )}
                <Grid
                    item
                    md={hasHeroGraphic ? 6 : 12}
                    xs={12}
                    sx={{
                        pr: {
                            xs: 0,
                            md: hasHeroGraphic && alignment === "right" ? 1 : 0,
                        },
                        pl: {
                            xs: 0,
                            md: hasHeroGraphic && alignment === "left" ? 1 : 0,
                        },
                    }}
                >
                    <Grid container direction="column">
                        <Grid item sx={{ mb: 2 }}>
                            <Typography variant="h2">{title}</Typography>
                        </Grid>
                        {description && (
                            <Grid item sx={{ mb: 4 }}>
                                <Typography variant="body1">
                                    {description}
                                </Typography>
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
            </Grid>
        </Box>
    );
}
