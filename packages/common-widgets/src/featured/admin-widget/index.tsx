import React, { useEffect, useMemo, useState } from "react";
import { Address, Course } from "@courselit/common-models";
import Settings from "../settings";
import { FormLabel, Grid, Skeleton, TextField } from "@mui/material";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { RichText as TextEditor, Select } from "@courselit/components-library";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({
    settings,
    onChange,
    address,
    dispatch,
}: AdminWidgetProps) {
    const [productId, setProductId] = useState(settings.productId || "");
    const [products, setProducts] = useState([]);
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(
        settings.description
            ? TextEditor.hydrate({ data: settings.description })
            : TextEditor.emptyState()
    );
    const [buyButtonCaption, setBuyButtonCaption] = useState(
        settings.buyButtonCaption
    );
    const [alignment, setAlignment] = useState(settings.alignment);

    useEffect(() => {
        onChange({
            productId,
            title,
            description: TextEditor.stringify(description),
            buyButtonCaption,
            alignment,
        });
    }, [productId, title, description, buyButtonCaption, alignment]);

    useEffect(() => {
        loadPublishedProducts();
    }, []);

    // const loadCourse = async () => {
    //     const query = `
    //         query {
    //             product: getCourse(courseId: "${productId}") {
    //                 title,
    //                 description,
    //                 featuredImage {
    //                     file,
    //                     thumbnail,
    //                     caption
    //                 },
    //                 creatorName,
    //                 creatorId,
    //                 courseId,
    //             }
    //         }
    //     `;
    //     const fetch = new FetchBuilder()
    //         .setUrl(`${address.backend}/api/graph`)
    //         .setPayload(query)
    //         .setIsGraphQLEndpoint(true)
    //         .build();

    //     try {
    //         dispatch(actionCreators.networkAction(true));
    //         const response = await fetch.exec();
    //         console.log(response);
    //         if (response.product) {
    //             setProduct(response.product);
    //         }
    //     } catch (err) {
    //         console.log("Error", err.message);
    //     } finally {
    //         dispatch(actionCreators.networkAction(false));
    //     }
    // };

    const loadPublishedProducts = async () => {
        const query = `
            query {
                products: getCourses(offset: 1, filterBy: [COURSE, DOWNLOAD]) {
                    title,
                    courseId,
                    type
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.products) {
                setProducts(response.products);
            }
        } catch (err: any) {
            console.log(err);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    if (products.length < 1) {
        return (
            <>
                <Skeleton variant="rectangular" height={50} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={20} />
            </>
        );
    }

    return (
        <Grid container>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Select
                    title="Select a product"
                    value={productId}
                    options={products.map((product) => ({
                        label: product.title,
                        value: product.courseId,
                        sublabel: capitalize(product.type),
                    }))}
                    onChange={(productId) => setProductId(productId)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    value={title}
                    label="Custom title"
                    onChange={(e) => setTitle(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <FormLabel>Custom description</FormLabel>
                <TextEditor
                    initialContentState={description}
                    onChange={(editorState: any) => setDescription(editorState)}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                    variant="outlined"
                    fullWidth
                    value={buyButtonCaption}
                    label="Buy button"
                    onChange={(e) => setBuyButtonCaption(e.target.value)}
                />
            </Grid>
            <Grid item xs={12}>
                <Select
                    title="Alignment"
                    value={alignment}
                    options={[
                        { label: "Top", value: "top" },
                        { label: "Bottom", value: "bottom" },
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value) => setAlignment(value)}
                />
            </Grid>
        </Grid>
    );
}
