import { Repository } from "../core/repository";
import { PaymentPlan } from "@courselit/common-models";

export interface PaymentPlanRepository extends Repository<PaymentPlan> {
    findByPlanId(planId: string, domainId: string): Promise<PaymentPlan | null>;
    removeProductFromPlans(productId: string, domainId: string): Promise<void>;
}
