import { InboundEmailReceiptStatus } from "./constants";

export type InboundEmailReceiptStatus =
    (typeof InboundEmailReceiptStatus)[keyof typeof InboundEmailReceiptStatus];
