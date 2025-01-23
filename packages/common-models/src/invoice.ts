import { Constants } from ".";

const { InvoiceStatus } = Constants;

export type InvoicesStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice {
    invoiceId: string;
    membershipId: string;
    amount: number;
    status: InvoicesStatus;
    paymentProcessor: string;
    paymentProcessorTransactionId?: string;
    paymentProcessorEntityId?: string;
    currencyISOCode: string;
    createdAt?: Date;
    updatedAt?: Date;
}
