import { MongooseRepository } from "./base.repository";
import { InvoiceRepository } from "../../contracts/invoice.repository";
import { Invoice } from "@courselit/common-models";
import { InternalInvoice } from "../../models/invoice";
import mongoose, { Model } from "mongoose";

export class MongooseInvoiceRepository
    extends MongooseRepository<Invoice, InternalInvoice>
    implements InvoiceRepository
{
    constructor(model: Model<InternalInvoice>) {
        super(model);
    }

    protected toEntity(doc: InternalInvoice): Invoice {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as Invoice;
    }

    async findByInvoiceId(
        invoiceId: string,
        domainId: string,
    ): Promise<Invoice | null> {
        const doc = await this.model
            .findOne({ invoiceId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalInvoice) : null;
    }

    async countByStatus(status: string, domainId: string): Promise<number> {
        return await this.model.countDocuments({ status, domain: domainId });
    }

    async findByMembership(
        membershipId: string,
        domainId: string,
        options: { limit?: number } = {},
    ): Promise<Invoice[]> {
        const query = this.model.find({ membershipId, domain: domainId });
        if (options.limit) {
            query.limit(options.limit);
        }
        query.sort({ createdAt: -1 });
        const docs = await query.lean();
        return docs.map((doc) => this.toEntity(doc as InternalInvoice));
    }
}
