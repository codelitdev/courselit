import { mailgunAdapter } from "./mailgun";
import { postmarkAdapter } from "./postmark";
import { sesAdapter } from "./ses";
import type { InboundEmailAdapter, InboundEmailProvider } from "../types";

const adapters: Record<InboundEmailProvider, InboundEmailAdapter> = {
    ses: sesAdapter,
    postmark: postmarkAdapter,
    mailgun: mailgunAdapter,
};

export function getInboundEmailAdapter(provider: string) {
    return adapters[provider as InboundEmailProvider];
}
