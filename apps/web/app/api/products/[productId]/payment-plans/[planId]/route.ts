import { NextRequest, NextResponse } from "next/server";
import { Constants, PaymentPlan } from "@courselit/common-models";
import { getCourseOrThrow } from "@/graphql/courses/logic";
import {
    archivePaymentPlan,
    getPlan,
    updatePlan,
} from "@/graphql/paymentplans/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializePaymentPlan } from "../../../product-response";

const paymentPlanFields = new Set([
    "name",
    "type",
    "oneTimeAmount",
    "emiAmount",
    "emiTotalInstallments",
    "subscriptionMonthlyAmount",
    "subscriptionYearlyAmount",
    "description",
]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !paymentPlanFields.has(key));
}

function isProductPlan(plan: PaymentPlan, productId: string) {
    return (
        plan.entityId === productId &&
        plan.entityType === Constants.MembershipEntityType.COURSE
    );
}

async function getDefaultPaymentPlan(productId: string, ctx: any) {
    const product = await getCourseOrThrow(undefined, ctx, productId);
    return product?.defaultPaymentPlan;
}

function paymentPlanNotFound() {
    return publicApiError("not_found", "Payment plan not found", 404);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; planId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, planId } = await params;

    try {
        const plan = await getPlan({ planId, ctx: auth.ctx as any });
        if (!isProductPlan(plan, productId)) {
            return paymentPlanNotFound();
        }
        const defaultPaymentPlan = await getDefaultPaymentPlan(
            productId,
            auth.ctx as any,
        );

        return NextResponse.json(
            serializePaymentPlan(plan, defaultPaymentPlan),
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to fetch payment plan",
            422,
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; planId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, planId } = await params;
    const body = auth.body;
    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported payment plan field: ${unsupportedField}`,
            400,
        );
    }

    try {
        const existingPlan = await getPlan({ planId, ctx: auth.ctx as any });
        if (!isProductPlan(existingPlan, productId)) {
            return paymentPlanNotFound();
        }

        const plan = await updatePlan({
            planId,
            ...body,
            ctx: auth.ctx as any,
        } as any);
        const defaultPaymentPlan = await getDefaultPaymentPlan(
            productId,
            auth.ctx as any,
        );

        return NextResponse.json(
            serializePaymentPlan(plan, defaultPaymentPlan),
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to update payment plan",
            422,
        );
    }
}

export async function DELETE(
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
            return paymentPlanNotFound();
        }

        const plan = await archivePaymentPlan({
            planId,
            ctx: auth.ctx as any,
        });
        const defaultPaymentPlan = await getDefaultPaymentPlan(
            productId,
            auth.ctx as any,
        );

        return NextResponse.json(
            serializePaymentPlan(plan, defaultPaymentPlan),
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to archive payment plan",
            422,
        );
    }
}
