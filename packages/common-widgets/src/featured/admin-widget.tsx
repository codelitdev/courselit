import React, { useEffect, useState } from "react";
import type { Address } from "@courselit/common-models";
import Settings from "./settings";
import {
    FormLabel,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Skeleton,
    TextField,
    Typography,
} from "@mui/material";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { Select, TextEditor } from "@courselit/components-library";
import { Delete } from "@mui/icons-material";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({
    name,
    settings,
    onChange,
    address,
    dispatch,
}: AdminWidgetProps) {
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState(settings.products || []);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(settings.description);
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor || "inherit"
    );
    const [color, setColor] = useState(settings.color || "inherit");

    useEffect(() => {
        onChange({
            title,
            description,
            backgroundColor,
            color,
            products,
        });
    }, [products, title, description, backgroundColor, color]);

    useEffect(() => {
        loadPublishedProducts();
    }, []);

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
            setProductsLoaded(true);
            if (response.products) {
                setAllProducts(response.products);
            }
        } catch (err: any) {
            console.log(err); // eslint-disable-line no-console
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    if (!productsLoaded) {
        return (
            <>
                <Skeleton variant="rectangular" height={50} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={20} />
            </>
        );
    }

    const addProduct = (productId: string) => {
        setProducts([productId, ...products]);
    };

    const removeProduct = (productId: string) => {
        setProducts([...products.filter((product) => product !== productId)]);
    };

    return (
        <Grid container>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Select
                    title="Select a product"
                    value={""}
                    options={allProducts
                        .filter(
                            (product) => !products.includes(product.courseId)
                        )
                        .map((product) => ({
                            label: product.title,
                            value: product.courseId,
                            sublabel: capitalize(product.type),
                        }))}
                    onChange={addProduct}
                />
            </Grid>
            <Grid item xs={12}>
                <List>
                    {products.map((product: string) => {
                        const productItem = allProducts.filter(
                            (productItem) => productItem.courseId === product
                        )[0];
                        if (!productItem) return <></>;
                        return (
                            <ListItem
                                key={productItem.courseId}
                                secondaryAction={
                                    <IconButton
                                        onClick={() => removeProduct(product)}
                                    >
                                        <Delete />
                                    </IconButton>
                                }
                            >
                                <ListItemText primary={productItem.title} />
                            </ListItem>
                        );
                    })}
                </List>
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
                    initialContent={description}
                    onChange={(state: any) => setDescription(state)}
                    showToolbar={false}
                />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">
                            Background color
                        </Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle1">Text color</Typography>
                    </Grid>
                    <Grid item>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
