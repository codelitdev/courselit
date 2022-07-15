import { Course, WidgetProps } from "@courselit/common-models";
import { Image, PriceTag, RichText } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    Button,
    Grid,
    GridDirection,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import Settings from "./settings";

export default function Widget({
    settings: { productId, title, description, buyButtonCaption, alignment },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const [product, setProduct] = useState<Partial<Course>>({});
    const theme = useTheme();
    const smallScreen = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        if (productId) {
            loadCourse();
        }
    }, [productId]);

    const loadCourse = async () => {
        const query = `
            query {
                product: getCourse(courseId: "${productId}") {
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
                    <Grid item sx={{ mb: 1 }}>
                        <PriceTag
                            cost={product.cost}
                            freeCostCaption="FREE"
                            siteInfo={state.siteinfo}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 1 }}>
                        <Typography variant="h2">
                            {title || product.title}
                        </Typography>
                    </Grid>
                    {(plainTextDescription || product.description) && (
                        <Grid item sx={{ mb: 2 }}>
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
                        </Grid>
                    )}
                    <Grid item>
                        <Button
                            onClick={() => {}}
                            variant="contained"
                            size="large"
                            disableElevation
                        >
                            {buyButtonCaption || "Enroll Now"}
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
