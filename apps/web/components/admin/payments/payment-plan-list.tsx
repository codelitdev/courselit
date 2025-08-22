"use client";

import { useContext, useState } from "react";
import { Plus, Archive, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Constants,
    MembershipEntityType,
    PaymentPlan,
} from "@courselit/common-models";
import { capitalize } from "@courselit/utils";
import Link from "next/link";
import { SiteInfoContext } from "@/components/contexts";
import { getSymbolFromCurrency } from "@courselit/components-library";
const { PaymentPlanType: paymentPlanType } = Constants;

function formatAmount(amount: number | undefined, currencySymbol): string {
    return amount ? `${currencySymbol}${amount.toFixed(2)}` : "Free";
}

function getPlanAmount(
    plan: PaymentPlan,
    currencySymbol: string,
): string | { amount: string; installments: number } {
    switch (plan.type) {
        case paymentPlanType.FREE:
            return capitalize(paymentPlanType.FREE);
        case paymentPlanType.ONE_TIME:
            return formatAmount(plan.oneTimeAmount, currencySymbol);
        case paymentPlanType.SUBSCRIPTION:
            return formatAmount(
                plan.subscriptionMonthlyAmount || plan.subscriptionYearlyAmount,
                currencySymbol,
            );
        case paymentPlanType.EMI:
            return {
                amount: formatAmount(plan.emiAmount, currencySymbol),
                installments: plan.emiTotalInstallments || 0,
            };
        default:
            return "N/A";
    }
}

function getPlanTypeLabel(plan: PaymentPlan): string {
    const { type } = plan;

    switch (type) {
        case paymentPlanType.ONE_TIME:
            return "One time";
        case paymentPlanType.SUBSCRIPTION:
            return plan.subscriptionYearlyAmount ? "Yearly" : "Monthly";
        case paymentPlanType.EMI:
            return "EMI";
        case paymentPlanType.FREE:
            return "Free";
        default:
            return type;
    }
}

export default function PaymentPlanList({
    paymentPlans = [],
    onPlanArchived,
    onDefaultPlanChanged,
    defaultPaymentPlanId,
    entityId,
    entityType,
}: {
    paymentPlans: PaymentPlan[];
    onPlanArchived: (planId: PaymentPlan["planId"]) => void;
    onDefaultPlanChanged?: (planId: string) => void;
    defaultPaymentPlanId?: string;
    entityId: string;
    entityType: MembershipEntityType;
}) {
    const [planToArchive, setPlanToArchive] = useState<PaymentPlan | null>(
        null,
    );
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const siteinfo = useContext(SiteInfoContext);
    const currencySymbol =
        getSymbolFromCurrency(siteinfo.currencyISOCode || "$") || "$";

    function handleArchive(plan: PaymentPlan) {
        onPlanArchived(plan.planId);
        setPlanToArchive(null);
        setIsDialogOpen(false);
    }

    return (
        <div className="w-full max-w-md mx-auto p-2 space-y-2">
            <div className="space-y-2">
                {paymentPlans.map((plan) => (
                    <Link
                        key={plan.planId}
                        href={`/dashboard/paymentplan/${plan.entityType?.toLowerCase()}/${plan.entityId}/edit/${plan.planId}`}
                    >
                        <div className="p-2 border rounded-md bg-background hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-sm font-medium">
                                    {plan.name}
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() =>
                                                        onDefaultPlanChanged?.(
                                                            plan.planId,
                                                        )
                                                    }
                                                    disabled={
                                                        defaultPaymentPlanId ===
                                                        plan.planId
                                                    }
                                                >
                                                    <Star
                                                        className={`h-3 w-3`}
                                                        color={
                                                            defaultPaymentPlanId ===
                                                            plan.planId
                                                                ? "black"
                                                                : "#d3d3d3"
                                                        }
                                                    />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Make default</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Dialog
                                        open={isDialogOpen}
                                        onOpenChange={setIsDialogOpen}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => {
                                                                setPlanToArchive(
                                                                    plan,
                                                                );
                                                                setIsDialogOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <Archive className="h-3 w-3" />
                                                        </Button>
                                                    </DialogTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Archive plan</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Are you sure you want to
                                                    archive this plan?
                                                </DialogTitle>
                                                <DialogDescription>
                                                    This action cannot be
                                                    undone. This will
                                                    permanently archive the
                                                    payment plan &quot;
                                                    {planToArchive?.name}
                                                    &quot;.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setPlanToArchive(null);
                                                        setIsDialogOpen(false);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() =>
                                                        planToArchive &&
                                                        handleArchive(
                                                            planToArchive,
                                                        )
                                                    }
                                                >
                                                    Archive
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs">
                                    {(() => {
                                        const planAmount = getPlanAmount(
                                            plan,
                                            currencySymbol,
                                        );
                                        return typeof planAmount === "string"
                                            ? planAmount
                                            : `${planAmount.amount} × ${planAmount.installments}`;
                                    })()}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                                >
                                    {getPlanTypeLabel(plan)}
                                </Badge>
                            </div>
                        </div>
                    </Link>
                ))}
                <Link
                    href={`/dashboard/paymentplan/${entityType}/${entityId}/new`}
                >
                    <div className="p-2 border border-dashed rounded-md bg-background hover:border-primary/50 transition-colors group cursor-pointer mt-4">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                                New Plan
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                                {currencySymbol}0.00
                            </span>
                            <Badge
                                variant="secondary"
                                className="rounded-full px-1.5 py-0.5 text-[10px]"
                            >
                                Payment frequency
                            </Badge>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
