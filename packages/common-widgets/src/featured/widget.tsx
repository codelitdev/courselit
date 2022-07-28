import { Course, WidgetProps } from "@courselit/common-models";
import { Image, PriceTag, RichText } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    Button,
    Grid,
    GridDirection,
    Skeleton,
    Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import Settings from "./settings";

export default function Widget({
    name,
    settings: {
        productId,
        title,
        description,
        buttonCaption,
        buttonAction,
        alignment,
        entityId,
        type,
    },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const id = name === "featured" ? productId : entityId;
    const [product, setProduct] = useState<Partial<Course>>({});

    useEffect(() => {
        if (id) {
            if (type === "site" && name !== "featured") {
                setProduct({
                    title: state.siteinfo.title,
                });
            } else {
                loadCourse();
            }
        }
    }, [id]);

    const loadCourse = async () => {
        const query = `
            query {
                product: getCourse(id: "${id}") {
                    title,
                    description,
                    featuredImage {
                        file,
                        thumbnail,
                        caption
                    },
                    creatorName,
                    creatorId,
                    courseId,
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.product) {
                setProduct(response.product);
            }
        } catch (err) {
            console.log("Error", err.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    const plainTextDescription = RichText.getPlainText(description);
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

    if (!product.title) {
        return (
            <Grid container sx={{ p: 2 }} spacing={1}>
                <Grid item xs={12}>
                    <Skeleton variant="rectangular" height={200} />
                </Grid>
                <Grid item xs={12}>
                    <Skeleton variant="text" />
                </Grid>
                <Grid item xs={12}>
                    <Skeleton variant="text" />
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid
            container
            justifyContent="space-between"
            alignItems={verticalLayout ? "flex-start" : "center"}
            direction={direction}
        >
            {product.featuredImage && (
                <Grid
                    item
                    xs={12}
                    md={verticalLayout ? 12 : 6}
                    sx={{ p: 2, textAlign: "center", width: "100%" }}
                >
                    <Image
                        src={product.featuredImage.file}
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
            <Grid item xs={12} md={verticalLayout ? 12 : 6} sx={{ p: 2 }}>
                <Grid container direction="column">
                    {!(type === "site" && name === "banner") && (
                        <Grid item sx={{ mb: 1 }}>
                            <PriceTag
                                cost={product.cost}
                                freeCostCaption="FREE"
                                currencyISOCode={state.siteinfo.currencyISOCode}
                                currencyUnit={state.siteinfo.currencyUnit}
                            />
                        </Grid>
                    )}
                    <Grid item sx={{ mb: 1 }}>
                        <Typography variant="h2">
                            {title || product.title}
                        </Typography>
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        {(plainTextDescription || product.description) && (
                            <RichText
                                initialContentState={RichText.hydrate({
                                    data: plainTextDescription
                                        ? description
                                        : product.description ||
                                          RichText.stringify(
                                              RichText.emptyState()
                                          ),
                                })}
                                readOnly={true}
                            />
                        )}
                    </Grid>
                    {type === "site" && buttonAction && (
                        <Grid item>
                            <Button
                                component="a"
                                href={buttonAction}
                                variant="contained"
                                size="large"
                            >
                                {buttonCaption || "Set a URL"}
                            </Button>
                        </Grid>
                    )}
                    {((name === "banner" && type === "product") ||
                        name === "featured") && (
                        <Grid item>
                            <Button
                                component="a"
                                href={`/checkout/${id}`}
                                variant="contained"
                                size="large"
                            >
                                {buttonCaption || "Buy now"}
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Grid>
        </Grid>
    );
}
