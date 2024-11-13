"use client";

import CourseReports from "@components/admin/products/editor/reports";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const address = useContext(AddressContext);

    return <CourseReports address={address} id={id} prefix="/dashboard2" />;
}
