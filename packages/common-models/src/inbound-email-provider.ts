import { InboundEmailProvider } from "./constants";

export type InboundEmailProvider =
    (typeof InboundEmailProvider)[keyof typeof InboundEmailProvider];
