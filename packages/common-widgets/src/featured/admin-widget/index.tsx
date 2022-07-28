import React, { useEffect, useMemo, useState } from "react";
import { Address } from "@courselit/common-models";
import Settings from "../settings";
import { Grid, Skeleton } from "@mui/material";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { RichText as TextEditor, Select } from "@courselit/components-library";
import CustomSettings from "./custom-settings";

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
    const [productId, setProductId] = useState(settings.productId || "");
    const [products, setProducts] = useState([]);
    const customSettingsChanged = (customSettings: Settings) => {
        onChange(Object.assign({}, settings, customSettings));
    };

    useEffect(() => {
        onChange({
            ...settings,
            productId,
        });
    }, [productId]);

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
            {productId && (
                <CustomSettings
                    name={name}
                    settings={settings}
                    onChange={customSettingsChanged}
                />
            )}
        </Grid>
    );
}
