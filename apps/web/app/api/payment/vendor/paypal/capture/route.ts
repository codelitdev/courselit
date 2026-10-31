import DomainModel, { Domain } from "@models/Domain";
import PayPalPayment from "@/payments-new/paypal-payment";
import { getPaymentMethodFromSettings } from "@/payments-new";
import { error } from "@/services/logger";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get("token");
    const invoiceId = req.nextUrl.searchParams.get("invoiceId");
    const domainName = req.nextUrl.searchParams.get("domainName");
    const redirectUrl = new URL(
        `/checkout/verify?id=${invoiceId || ""}`,
        req.nextUrl.origin,
    );

    if (!orderId || !domainName) {
        return Response.redirect(redirectUrl, 302);
    }

    try {
        const domain = await DomainModel.findOne<Domain>({ name: domainName });

        if (!domain?.settings) {
            return Response.redirect(redirectUrl, 302);
        }

        const paymentMethod = await getPaymentMethodFromSettings(
            domain.settings,
            "paypal",
        );

        if (!(paymentMethod instanceof PayPalPayment)) {
            return Response.redirect(redirectUrl, 302);
        }

        await paymentMethod.captureOrder(orderId);
    } catch (e: any) {
        error(`Error capturing PayPal order: ${e.message}`, {
            domainName,
            invoiceId,
            orderId,
        });
    }

    return Response.redirect(redirectUrl, 302);
}
