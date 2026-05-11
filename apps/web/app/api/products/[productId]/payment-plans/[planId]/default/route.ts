import { NextRequest, NextResponse } from "next/server";
import { Constants, PaymentPlan } from "@courselit/common-models";
import { changeDefaultPlan, getPlan } from "@/graphql/paymentplans/logic";
import { publicApiError, validatePublicApiRequest } from "@/app/api/public-api";
import { serializePaymentPlan } from "../../../../product-response";

function isProductPlan(plan: PaymentPlan, productId: string) {
    return (
        plan.entityId === productId &&
        plan.entityType === Constants.MembershipEntityType.COURSE
    );
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; planId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, planId } = await params;

    try {
        const existingPlan = await getPlan({ planId, ctx: auth.ctx as any });
        if (!isProductPlan(existingPlan, productId)) {
            return publicApiError("not_found", "Payment plan not found", 404);
        }

        const plan = await changeDefaultPlan({
            planId,
            entityId: productId,
            entityType: Constants.MembershipEntityType.COURSE,
            ctx: auth.ctx as any,
        });

        return NextResponse.json(serializePaymentPlan(plan, plan.planId));
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to change default payment plan",
            422,
        );
    }
}
