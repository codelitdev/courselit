"use client";

import ProductEditorLayout from "@components/admin/products/editor/layout";
import CourseReports from "@components/admin/products/editor/reports";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const { id } = params;

    return (
        <ProductEditorLayout>
            <CourseReports id={id} />
        </ProductEditorLayout>
    );
}
