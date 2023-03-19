import { Course, WidgetProps } from "@courselit/common-models";
import { CourseItem, TextRenderer } from "@courselit/components-library";
import { actionCreators } from "@courselit/state-management";
import {
    FetchBuilder,
    getGraphQLQueryStringFromObject,
} from "@courselit/utils";
import { Grid, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import Settings from "./settings";

export default function Widget({
    name,
    settings: {
        products,
        title,
        description,
        backgroundColor,
        color,
        headerAlignment,
    },
    state,
    dispatch,
    config,
}: WidgetProps<Settings>) {
    const [productItems, setProductItems] = useState<Partial<Course>[]>([]);

    useEffect(() => {
        if (products && products.length) {
            loadCourses();
        } else {
            setProductItems([]);
        }
    }, [products]);

    const loadCourses = async () => {
        const productsArgs = getGraphQLQueryStringFromObject(products);
        const query = `
            query {
                product: getCourses(ids: ${productsArgs}) {
                    title,
                    description,
                    featuredImage {
                        file,
                        thumbnail,
                        caption
                    },
                    courseId,
                    cost,
                    type,
                    pageId
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
                setProductItems(response.product);
            }
        } catch (err) {
            console.log("Error", err.message); // eslint-disable-line no-console
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <Grid
            container
            justifyContent="space-between"
            direction="column"
            sx={{
                color,
                backgroundColor: backgroundColor,
                p: 2,
            }}
        >
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    direction="column"
                    alignItems={
                        headerAlignment === "center" ? "center" : "flex-start"
                    }
                >
                    <Grid item>
                        <Typography variant="h4">{title}</Typography>
                    </Grid>
                    {description && (
                        <Grid item>
                            <TextRenderer json={description} />
                        </Grid>
                    )}
                </Grid>
            </Grid>
            {productItems.length > 0 && (
                <Grid container spacing={2}>
                    {productItems.map((course: Course, index: number) => (
                        <CourseItem
                            course={course}
                            siteInfo={state.siteinfo}
                            freeCostCaption={config.FREE_COST_CAPTION as string}
                            key={index}
                        />
                    ))}
                </Grid>
            )}
        </Grid>
    );
}
