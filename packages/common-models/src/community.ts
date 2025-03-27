import { Media } from "./media";
import { PaymentPlan } from "./payment-plan";
import { TextEditorContent } from "./text-editor-content";

export interface Community {
    communityId: string;
    name: string;
    description: Record<string, unknown>;
    banner: TextEditorContent | null;
    categories: string[];
    enabled: boolean;
    joiningReasonText?: string;
    pageId: string;
    products: string[];
    autoAcceptMembers: boolean;
    paymentPlans: PaymentPlan[];
    defaultPaymentPlan?: string;
    featuredImage?: Media;
    membersCount: number;
}
