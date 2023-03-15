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
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";
import { Delete } from "@mui/icons-material";
import { Alignment } from "@courselit/common-models";

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
    const dummyDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                    },
                ],
            },
        ],
    };
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState(settings.products || []);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [title, setTitle] = useState(settings.title || "Featured");
    const [description, setDescription] = useState(
        settings.description || dummyDescription
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor || "inherit"
    );
    const [color, setColor] = useState(settings.color || "inherit");
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "left"
    );

    useEffect(() => {
        onChange({
            title,
            description,
            backgroundColor,
            color,
            products,
            headerAlignment,
        });
    }, [products, title, description, backgroundColor, color, headerAlignment]);

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

    const addProduct = (productId: string) => {
        setProducts([productId, ...products]);
    };

    const removeProduct = (productId: string) => {
        setProducts([...products.filter((product) => product !== productId)]);
    };

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Header">
                    <Grid item sx={{ mb: 2 }}>
                        <TextField
                            variant="outlined"
                            fullWidth
                            value={title}
                            label="Title"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <FormLabel>Description</FormLabel>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <Select
                            title="Header alignment"
                            value={headerAlignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                            ]}
                            onChange={(value: Alignment) =>
                                setHeaderAlignment(value)
                            }
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
            {!productsLoaded && (
                <Grid item>
                    <Skeleton
                        variant="rectangular"
                        height={50}
                        sx={{ mb: 2 }}
                    />
                    <Skeleton variant="rectangular" height={20} />
                </Grid>
            )}
            {productsLoaded && (
                <Grid item sx={{ mb: 4 }}>
                    <AdminWidgetPanel title="Products">
                        <Grid item sx={{ mb: 2 }}>
                            <Select
                                title="Select a product"
                                value={""}
                                options={allProducts
                                    .filter(
                                        (product) =>
                                            !products.includes(product.courseId)
                                    )
                                    .map((product) => ({
                                        label: product.title,
                                        value: product.courseId,
                                        sublabel: capitalize(product.type),
                                    }))}
                                onChange={addProduct}
                            />
                        </Grid>
                        <Grid item>
                            <List>
                                {products.map((product: string) => {
                                    const productItem = allProducts.filter(
                                        (productItem) =>
                                            productItem.courseId === product
                                    )[0];
                                    if (!productItem) return <></>;
                                    return (
                                        <ListItem
                                            key={productItem.courseId}
                                            secondaryAction={
                                                <IconButton
                                                    onClick={() =>
                                                        removeProduct(product)
                                                    }
                                                    size="small"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={productItem.title}
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Grid>
                    </AdminWidgetPanel>
                </Grid>
            )}
            <Grid item sx={{ mb: 4 }}>
                <AdminWidgetPanel title="Design">
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Background color"
                            value={backgroundColor}
                            onChange={(value: string) =>
                                setBackgroundColor(value)
                            }
                        />
                    </Grid>
                    <Grid item sx={{ mb: 2 }}>
                        <ColorSelector
                            title="Color"
                            value={color}
                            onChange={(value: string) => setColor(value)}
                        />
                    </Grid>
                </AdminWidgetPanel>
            </Grid>
        </Grid>
    );
}
