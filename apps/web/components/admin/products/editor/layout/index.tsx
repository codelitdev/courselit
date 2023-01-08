import { useRouter } from "next/router";
import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../../../ui-config/strings";
import { Grid } from "@mui/material";
import generateTabs from "./tabs-data";

const BaseLayout = dynamic(() => import("../../../base-layout"));
const ProductHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("../../../../tabs"));

export interface ProductEditorLayoutProps {
    children: ReactNode;
}

export default function ProductEditorLayout({
    children,
}: ProductEditorLayoutProps) {
    const router = useRouter();
    const { id } = router.query;
    const breadcrumbs = [{ text: "Products", url: `/dashboard/products` }];

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <Grid container direction="column">
                <Grid item sx={{ mb: 4 }}>
                    <ProductHeader
                        id={id as string}
                        breadcrumbs={breadcrumbs}
                    />
                </Grid>
                <Grid item sx={{ mb: 4 }}>
                    <Tabs tabs={generateTabs(id as string)} />
                </Grid>
                <Grid item>{children}</Grid>
            </Grid>
        </BaseLayout>
    );
}
