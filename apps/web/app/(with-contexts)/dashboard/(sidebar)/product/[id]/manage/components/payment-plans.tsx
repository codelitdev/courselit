"use client";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import { PaymentPlanType, Constants } from "@courselit/common-models";
import PaymentPlanList from "@components/admin/payments/payment-plan-list";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";

const { MembershipEntityType } = Constants;

interface PaymentPlansProps {
    productId: string;
    paymentPlans: any[];
    setPaymentPlans: (plans: any[]) => void;
    defaultPaymentPlan: string;
    setDefaultPaymentPlan: (planId: string) => void;
    onPlanArchived: (planId: string) => Promise<any>;
    onDefaultPlanChanged: (planId: string) => Promise<any>;
    loading: boolean;
}

export default function PaymentPlans({
    productId,
    paymentPlans,
    setPaymentPlans,
    defaultPaymentPlan,
    setDefaultPaymentPlan,
    onPlanArchived,
    onDefaultPlanChanged,
    loading,
}: PaymentPlansProps) {
    const { toast } = useToast();

    return (
        <div className="space-y-8">
            <div className="space-y-4 flex flex-col md:flex-row md:items-start md:justify-between w-full">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Pricing</Label>
                    <p className="text-sm text-muted-foreground">
                        Manage your product&apos;s pricing plans
                    </p>
                </div>
                <PaymentPlanList
                    paymentPlans={paymentPlans.map((plan) => ({
                        ...plan,
                        type: plan.type.toLowerCase() as PaymentPlanType,
                    }))}
                    onPlanArchived={async (id) => {
                        try {
                            await onPlanArchived(id);
                        } catch (err: any) {
                            toast({
                                title: TOAST_TITLE_ERROR,
                                description: err.message,
                                variant: "destructive",
                            });
                        }
                    }}
                    onDefaultPlanChanged={async (id) => {
                        try {
                            await onDefaultPlanChanged(id);
                        } catch (err: any) {
                            toast({
                                title: TOAST_TITLE_ERROR,
                                description: err.message,
                            });
                        }
                    }}
                    defaultPaymentPlanId={defaultPaymentPlan}
                    entityId={productId}
                    entityType={"product"}
                    disabled={loading}
                />
            </div>
            <Separator />
        </div>
    );
}
