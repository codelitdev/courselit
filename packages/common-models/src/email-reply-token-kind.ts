import { EmailReplyTokenKind } from "./constants";

export type EmailReplyTokenKind =
    (typeof EmailReplyTokenKind)[keyof typeof EmailReplyTokenKind];
