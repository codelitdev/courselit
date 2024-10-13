"use client";

import NewCustomer from "@components/admin/products/new-customer";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const address = useContext(AddressContext);

    return (
        <NewCustomer
            courseId={id as string}
            prefix="/dashboard2"
            address={address}
        />
    );
}
