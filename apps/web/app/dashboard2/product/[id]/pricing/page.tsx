"use client";

import PricingEditor from "@components/admin/products/editor/pricing";
import { AddressContext, SiteInfoContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const { id } = params;

    return (
        <PricingEditor
            id={id as string}
            address={address}
            siteinfo={siteinfo}
        />
    );
}
