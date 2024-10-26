"use client";

import { NewProduct } from "@components/admin/products/new-product";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <NewProduct
            address={address}
            networkAction={false}
            prefix="/dashboard2"
        />
    );
}
