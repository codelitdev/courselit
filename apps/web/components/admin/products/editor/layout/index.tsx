import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import generateTabs from "./tabs-data";
import { Address } from "@courselit/common-models";

const ProductHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("@components/tabs"));

export interface ProductEditorLayoutProps {
    id: string;
    children: ReactNode;
    address: Address;
    prefix: string;
}

export default function ProductEditorLayout({
    id,
    children,
    prefix,
}: ProductEditorLayoutProps) {
    const breadcrumbs = [{ text: "Products", url: `/dashboard/products` }];

    return (
        <div className="flex flex-col">
            <div className="flex flex-col gap-4">
                <ProductHeader id={id as string} breadcrumbs={breadcrumbs} />
                <Tabs tabs={generateTabs(prefix, id as string)} />
                {children}
            </div>
        </div>
    );
}
