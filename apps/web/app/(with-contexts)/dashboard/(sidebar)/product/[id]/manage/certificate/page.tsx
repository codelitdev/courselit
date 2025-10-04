"use client";

import DashboardContent from "@components/admin/dashboard-content";
import {
    COURSE_SETTINGS_CARD_HEADER,
    CUSTOMIZE_CERTIFICATE_TEMPLATE,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import useProduct from "@/hooks/use-product";
import { redirect, useParams } from "next/navigation";
import { useEffect } from "react";
import { UIConstants } from "@courselit/common-models";

export default function CertificatePage() {
    const params = useParams();
    const productId = params?.id as string;
    const { product } = useProduct(productId);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        {
            label: COURSE_SETTINGS_CARD_HEADER,
            href: `/dashboard/product/${productId}/manage`,
        },
        { label: CUSTOMIZE_CERTIFICATE_TEMPLATE, href: "#" },
    ];

    useEffect(() => {
        if (
            product &&
            (!product.certificate ||
                product.type?.toLowerCase() !== UIConstants.COURSE_TYPE_COURSE)
        ) {
            redirect(`/dashboard/product/${productId}/manage`);
        }
    }, [product]);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-semibold">Certificate</h1>
                </div>
            </div>
        </DashboardContent>
    );
}
