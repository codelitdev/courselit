import { NextRequest, NextResponse } from "next/server";
import { Constants } from "@courselit/common-models";
import { getCourseOrThrow } from "@/graphql/courses/logic";
import { createPlan, getPlansForEntity } from "@/graphql/paymentplans/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializePaymentPlan } from "../../product-response";

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

async function getDefaultPaymentPlan(productId: string, ctx: any) {
    const product = await getCourseOrThrow(undefined, ctx, productId);
    return product?.defaultPaymentPlan;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;

    try {
        const defaultPaymentPlan = await getDefaultPaymentPlan(
            productId,
            auth.ctx as any,
        );
        const plans = await getPlansForEntity({
            entityId: productId,
            entityType: Constants.MembershipEntityType.COURSE,
            ctx: auth.ctx as any,
        });

        return NextResponse.json({
            data: plans.map((plan) =>
                serializePaymentPlan(plan, defaultPaymentPlan),
            ),
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to fetch payment plans",
            422,
        );
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
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
        const plan = await createPlan({
            ...body,
            entityId: productId,
            entityType: Constants.MembershipEntityType.COURSE,
            ctx: auth.ctx as any,
        } as any);
        const defaultPaymentPlan = await getDefaultPaymentPlan(
            productId,
            auth.ctx as any,
        );

        return NextResponse.json(
            serializePaymentPlan(plan, defaultPaymentPlan),
            {
                status: 201,
            },
        );
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to create payment plan",
            422,
        );
    }
}
