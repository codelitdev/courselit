import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Address } from "@courselit/common-models";
import { usePathname } from "next/navigation";
import useCourse from "../course-hook";

const ProductHeader = dynamic(() => import("./header"));
const Tabs = dynamic(() => import("@components/tabs"));

export interface ProductEditorLayoutProps {
    id: string;
    children: ReactNode;
    address: Address;
}

export default function ProductEditorLayout({
    id,
    children,
    address,
}: ProductEditorLayoutProps) {
    const course = useCourse(id, address);
    // const breadcrumbs = [
    //     { text: "Products", url: "/dashboard/products" },
    //     { text: truncate(course?.title || "", 20), url: "" },
    // ];
    const path = usePathname();

    return (
        <div className="flex flex-col gap-4">
            <ProductHeader id={id as string} address={address} />
            {course && children}
        </div>
    );
}
