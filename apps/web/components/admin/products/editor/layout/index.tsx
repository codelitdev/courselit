import { useRouter } from "next/router";
import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../../../ui-config/strings";
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
            <div className="flex flex-col gap-4">
                <ProductHeader id={id as string} breadcrumbs={breadcrumbs} />
                <Tabs tabs={generateTabs(id as string)} />
                {children}
            </div>
        </BaseLayout>
    );
}
