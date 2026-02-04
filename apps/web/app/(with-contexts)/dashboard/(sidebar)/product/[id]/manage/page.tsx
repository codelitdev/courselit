"use client";

import { useEffect } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import { useParams, useRouter } from "next/navigation";
import { truncate } from "@ui-lib/utils";
import { Constants, UIConstants } from "@courselit/common-models";
import useProduct from "@/hooks/use-product";
import { usePaymentPlanOperations } from "@/hooks/use-payment-plan-operations";
import {
    COURSE_SETTINGS_CARD_HEADER,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";

// Import the new components
import ProductDetails from "./components/product-details";
import ProductFeaturedImage from "./components/product-featured-image";
import PaymentPlans from "./components/payment-plans";
import DownloadOptions from "./components/download-options";
import ProductPublishing from "./components/product-publishing";
import Certificates from "./components/certificates";
import ProductDeletion from "./components/product-deletion";

const { permissions } = UIConstants;

const { MembershipEntityType } = Constants;

export default function SettingsPage() {
    const params = useParams();
    const productId = params?.id as string;
    const { product, loaded: productLoaded } = useProduct(productId);
    const {
        paymentPlans,
        setPaymentPlans,
        defaultPaymentPlan,
        setDefaultPaymentPlan,
        onPlanArchived,
        onDefaultPlanChanged,
        loading,
    } = usePaymentPlanOperations({
        id: productId,
        entityType: MembershipEntityType.COURSE,
    });

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        { label: COURSE_SETTINGS_CARD_HEADER, href: "#" },
    ];

    useEffect(() => {
        if (product) {
            setPaymentPlans(product?.paymentPlans || []);
            setDefaultPaymentPlan(product?.defaultPaymentPlan || "");
        }
    }, [product]);

    const router = useRouter();

    useEffect(() => {
        if (productLoaded && !product) {
            router.replace("/dashboard/products");
        }
    }, [productLoaded, product, router]);

    if (!product) {
        return null;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-semibold">Manage</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your product settings
                        </p>
                    </div>
                </div>
                <ProductDetails product={product} />
                <ProductFeaturedImage product={product} />
                <PaymentPlans
                    productId={productId || ""}
                    paymentPlans={paymentPlans}
                    setPaymentPlans={setPaymentPlans}
                    defaultPaymentPlan={defaultPaymentPlan || ""}
                    setDefaultPaymentPlan={setDefaultPaymentPlan}
                    onPlanArchived={async (id) => {
                        await onPlanArchived(id);
                        setPaymentPlans((prev) =>
                            prev.filter((p: any) => p.planId !== id),
                        );
                    }}
                    onDefaultPlanChanged={async (id) => {
                        await onDefaultPlanChanged(id);
                        setDefaultPaymentPlan(id);
                    }}
                    loading={loading}
                />
                <DownloadOptions
                    product={product}
                    paymentPlans={paymentPlans}
                />
                <ProductPublishing product={product} />
                <Certificates product={product} productId={productId || ""} />
                <ProductDeletion product={product} />
            </div>
        </DashboardContent>
    );
}
