import { NextRequest } from "next/server";
import { getDomain, getUser } from "../initiate-new/route";
import { auth } from "@/auth";
import { error } from "@/services/logger";
import InvoiceModel from "@models/Invoice";
import Membership from "@models/Membership";

interface RequestPayload {
    id: string;
}

export async function POST(req: NextRequest) {
    const body: RequestPayload = await req.json();
    const domainName = req.headers.get("domain");
    console.log("Domain:", domainName);
    console.log("Body:", body);

    try {
        const domain = await getDomain(domainName);
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }

        const session = await auth();
        const user = await getUser(session, domain._id);

        if (!user) {
            return Response.json({}, { status: 401 });
        }

        const { id } = body;

        if (!id) {
            return Response.json({ message: "Bad request" }, { status: 400 });
        }
        console.log("Invoice ID:", id);
        console.log("Invoices", await InvoiceModel.find());
        const invoice = await InvoiceModel.findOne({ invoiceId: id });
        console.log("Invoice:", invoice);

        if (!invoice) {
            return Response.json(
                { message: "Item not found" },
                { status: 404 },
            );
        }

        const membership = await Membership.findOne({
            membershipId: invoice.membershipId,
        });

        if (!membership || membership.userId !== user.userId) {
            return Response.json({}, { status: 401 });
        }

        return Response.json({ status: invoice.status });
    } catch (err: any) {
        error(`Error verifying invoice: ${err.message}`, {
            domain: domainName,
            body,
            stack: err.stack,
        });
        return Response.json({ message: err.message }, { status: 500 });
    }
}
