import { Repository } from "../core/repository";
import { Invoice } from "@courselit/common-models";

export interface InvoiceRepository extends Repository<Invoice> {
    findByInvoiceId(
        invoiceId: string,
        domainId: string,
    ): Promise<Invoice | null>;
    countByStatus(status: string, domainId: string): Promise<number>;
    findByMembership(
        membershipId: string,
        domainId: string,
        options?: { limit?: number },
    ): Promise<Invoice[]>;
}
