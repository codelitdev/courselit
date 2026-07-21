import type { InboundEmailProvider as SharedInboundEmailProvider } from "@courselit/common-models";

export type InboundEmailProvider = SharedInboundEmailProvider;

export interface NormalizedInboundEmail {
    to: string[];
    from: string;
    subject?: string;
    textBody: string;
    strippedReply?: string;
    messageId?: string;
}

export interface InboundEmailProcessingInput {
    provider: InboundEmailProvider;
    email: NormalizedInboundEmail;
}

export interface InboundEmailRequest {
    rawBody: string;
    headers: Headers;
    searchParams: URLSearchParams;
    contentType: string;
}

export type ParsedInboundEmail =
    | {
          kind: "email";
          email: NormalizedInboundEmail;
      }
    | {
          kind: "subscription_confirmation";
          subscribeUrl: string;
      }
    | {
          kind: "unsubscribe_confirmation";
      };

export interface InboundEmailAdapter {
    provider: InboundEmailProvider;
    verify(input: InboundEmailRequest): Promise<void>;
    parse(input: InboundEmailRequest): Promise<ParsedInboundEmail>;
}
