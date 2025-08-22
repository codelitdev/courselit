"use client";

import { useParams } from "next/navigation";
import { Constants, MembershipEntityType } from "@courselit/common-models";
import DashboardContent from "@/components/admin/dashboard-content";
import { PaymentPlanForm } from "@/components/admin/payments/payment-plan-form";
import {
    COMMUNITY_SETTINGS,
    NEW_PAYMENT_PLAN_HEADER,
    NEW_PAYMENT_PLAN_DESCRIPTION,
} from "@/ui-config/strings";
import { useEntityValidation } from "../use-entity-validation";
import { truncate } from "@courselit/utils";

const { MembershipEntityType: membershipEntityType } = Constants;

export default function NewPaymentPlanPage() {
    const params = useParams();
    const entityType = params?.type as MembershipEntityType;
    const entityId = params?.id as string;
    const { product, community } = useEntityValidation(entityType, entityId);

    const breadcrumbs = [
        {
            label:
                entityType === membershipEntityType.COMMUNITY
                    ? truncate(community?.name || "...", 10)
                    : truncate(product?.title || "...", 10),
            href: `/dashboard/${entityType}/${entityId}`,
        },
        {
            label: COMMUNITY_SETTINGS,
            href: `/dashboard/${entityType}/${entityId}/manage`,
        },
        { label: NEW_PAYMENT_PLAN_HEADER, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-2">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-semibold">
                            {NEW_PAYMENT_PLAN_HEADER}
                        </h1>
                        <p className="text-muted-foreground">
                            {NEW_PAYMENT_PLAN_DESCRIPTION}{" "}
                            {entityType.toLowerCase()}
                        </p>
                    </div>
                </div>
            </div>
            <PaymentPlanForm entityId={entityId} entityType={entityType} />
        </DashboardContent>
    );
}
