import React, { ChangeEvent, useEffect, useState } from "react";
import type { Theme, ThemeStyle } from "@courselit/page-models";
import Settings from "./settings";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import {
    AdminWidgetPanel,
    Select,
    TextEditor,
    IconButton,
    Form,
    FormField,
    CircularProgress,
    CssIdField,
    MaxWidthSelector,
    VerticalPaddingSelector,
} from "@courselit/components-library";
import { Delete } from "@courselit/icons";
import { Alignment, Address } from "@courselit/common-models";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    address,
    dispatch,
    theme,
}: AdminWidgetProps): JSX.Element {
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
        settings.description || dummyDescription,
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "left",
    );
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [cssId, setCssId] = useState(settings.cssId);

    useEffect(() => {
        onChange({
            title,
            description,
            products,
            headerAlignment,
            maxWidth,
            verticalPadding,
            cssId,
        });
    }, [
        products,
        title,
        description,
        headerAlignment,
        maxWidth,
        verticalPadding,
        cssId,
    ]);

    useEffect(() => {
        loadPublishedProducts();
    }, []);

    const loadPublishedProducts = async () => {
        const query = `
            query($limit: Int, $publicView: Boolean, $filter: [CourseFilters]) {
                products: getProducts(limit: $limit, filterBy: $filter, publicView: $publicView) {
                    title,
                    courseId,
                    type
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    limit: 1000,
                    publicView: true,
                    filter: ["COURSE", "DOWNLOAD"],
                },
            })
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
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Header">
                <Form>
                    <FormField
                        value={title}
                        label="Title"
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setTitle(e.target.value)
                        }
                    />
                </Form>
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <TextEditor
                        initialContent={description}
                        onChange={(state: any) => setDescription(state)}
                        showToolbar={false}
                        url={address.backend}
                    />
                </div>
                <Select
                    title="Header alignment"
                    value={headerAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setHeaderAlignment(value)}
                />
            </AdminWidgetPanel>
            {!productsLoaded && (
                <div className="flex justify-center mb-4">
                    <CircularProgress />
                </div>
            )}
            {productsLoaded && (
                <AdminWidgetPanel title="Products">
                    <Select
                        title="Select a product"
                        value={""}
                        options={allProducts
                            .filter(
                                (product) =>
                                    !products.includes(product.courseId),
                            )
                            .map((product) => ({
                                label: product.title,
                                value: product.courseId,
                                sublabel: capitalize(product.type),
                            }))}
                        onChange={addProduct}
                        defaultMessage={"Select a product"}
                    />
                    <ul className="flex flex-col gap-4">
                        {products.map((product: string) => {
                            const productItem = allProducts.filter(
                                (productItem) =>
                                    productItem.courseId === product,
                            )[0];
                            if (!productItem) return <></>;
                            return (
                                <li
                                    className="flex justify-between"
                                    key={productItem.courseId}
                                >
                                    <p>{productItem.title}</p>
                                    <IconButton
                                        onClick={() => removeProduct(product)}
                                        variant="soft"
                                    >
                                        <Delete />
                                    </IconButton>
                                </li>
                            );
                        })}
                    </ul>
                </AdminWidgetPanel>
            )}
            <AdminWidgetPanel title="Design">
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.padding.y
                    }
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}
