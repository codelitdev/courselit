import { Course, WidgetProps } from "@courselit/common-models";
import { Image, PriceTag, TextRenderer } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { Button, Grid, GridDirection, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import Settings from "./settings";

export default function Widget({
    name,
    settings: {
        title,
        description,
        buttonCaption,
        buttonAction,
        alignment,
        type,
        backgroundColor,
        color,
        buttonBackground,
        buttonForeground,
        textAlignment,
    },
    state,
    pageData: product,
}: WidgetProps<Settings>) {
    //const id = name === "featured" ? productId : entityId;
    //const [product, setProduct] = useState<Partial<Course>>(pageData);

    /*
    useEffect(() => {
        if (id) {
            if (type === "site" && name !== "featured") {
                setProduct({
                    title: state.siteinfo.title || "CourseLit",
                });
            }
        }
    }, [id]);
    */

    let direction: GridDirection;
    switch (alignment) {
        case "top":
            direction = "column-reverse";
            break;
        case "bottom":
            direction = "column";
            break;
        case "left":
            direction = "row";
            break;
        case "right":
            direction = "row-reverse";
            break;
        default:
            direction = "row";
    }
    const verticalLayout = ["top", "bottom"].includes(alignment);

    return (
        <Grid
            container
            justifyContent="space-between"
            direction={direction}
            alignItems={!verticalLayout ? "center" : ""}
            sx={{
                backgroundColor,
            }}
        >
            {product.featuredImage && (
                <Grid
                    item
                    md={verticalLayout ? 12 : 6}
                    sx={{ p: 2, textAlign: "center", width: 1 }}
                >
                    <Image
                        src={(product.featuredImage as any).file}
                        width={verticalLayout ? "100%" : 1}
                        height={
                            verticalLayout
                                ? {
                                      xs: 224,
                                      sm: 300,
                                      md: 384,
                                      lg: 590,
                                  }
                                : {
                                      xs: 224,
                                      sm: 352,
                                      md: 214,
                                      lg: 286,
                                  }
                        }
                    />
                </Grid>
            )}
            <Grid item md={verticalLayout ? 12 : 6} sx={{ p: 2, color }}>
                <Grid
                    container
                    direction="column"
                    alignItems={
                        textAlignment === "center" ? "center" : "flex-start"
                    }
                >
                    {!(type === "site" && name === "banner") && (
                        <Grid item sx={{ pb: 1 }}>
                            <PriceTag
                                cost={product.cost as number}
                                freeCostCaption="FREE"
                                currencyISOCode={state.siteinfo.currencyISOCode}
                            />
                        </Grid>
                    )}
                    <Grid item sx={{ pb: 1 }}>
                        <Typography variant="h2">
                            {title || product.title}
                        </Typography>
                    </Grid>
                    {(description || product.description) && (
                        <Grid
                            item
                            sx={{
                                pb: 2,
                                textAlign:
                                    textAlignment === "center"
                                        ? "center"
                                        : "left",
                            }}
                        >
                            <TextRenderer
                                json={
                                    description ||
                                    (product.description &&
                                        JSON.parse(
                                            product.description as string
                                        ))
                                }
                            />
                        </Grid>
                    )}
                    <Grid item>
                        <Button
                            component="a"
                            href={`/checkout/${product.courseId}`}
                            variant="contained"
                            size="large"
                            sx={{
                                backgroundColor: buttonBackground,
                                color: buttonForeground,
                            }}
                        >
                            {buttonCaption || "Buy now"}
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
