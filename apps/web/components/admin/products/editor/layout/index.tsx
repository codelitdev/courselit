import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import generateTabs from "./tabs-data";
import { Address } from "@courselit/common-models";
import { usePathname } from "next/navigation";
import useCourse from "../course-hook";
import { truncate } from "@ui-lib/utils";

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
    address,
    prefix,
}: ProductEditorLayoutProps) {
    const course = useCourse(id, address);
    const breadcrumbs = [
        { text: "Products", url: `${prefix}/products` },
        { text: truncate(course?.title || "", 20), url: "" },
    ];
    const path = usePathname();

    return (
        <div className="flex flex-col gap-4">
            <ProductHeader
                id={id as string}
                breadcrumbs={prefix === "/dashboard" ? breadcrumbs : undefined}
                address={address}
            />
            {!(
                path?.indexOf("section/") !== -1 && prefix === "/dashboard4"
            ) && <Tabs tabs={generateTabs(prefix, id as string)} />}

            {course && children}
        </div>
    );
}
