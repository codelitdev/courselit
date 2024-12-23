import { MembershipEntityType, PaymentPlan } from "@courselit/common-models";

export interface InitiateProps {
    metadata: Record<string, unknown>;
    paymentPlan: PaymentPlan;
    product: {
        title: string;
        type: MembershipEntityType;
    };
}

export default interface Payment {
    setup: () => void;
    initiate: (obj: InitiateProps) => void;
    verify: (event: any) => boolean;
    getPaymentIdentifier: (event: any) => unknown;
    getMetadata: (event: any) => Record<string, unknown>;
    getName: () => string;
}
