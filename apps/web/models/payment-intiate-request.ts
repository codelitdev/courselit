import { MembershipEntityType } from "@courselit/common-models";

export interface PaymentInitiateRequest {
    id: string;
    type: MembershipEntityType;
    planId: string;
    metadata: Record<string, unknown>;
}
