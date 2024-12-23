"use client";

import { useState } from "react";
import { Plus, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    PaymentPlanType,
    Constants,
    PaymentPlan,
} from "@courselit/common-models";
import { capitalize } from "@courselit/utils";
const { PaymentPlanType: paymentPlanType } = Constants;

// Mock data for demonstration
// const mockPaymentPlans: PaymentPlan[] = [
//     { planId: "1", name: "Basic Free", type: "free" },
//     { planId: "2", name: "Premium", type: "one-time", oneTimeAmount: 99.99 },
//     {
//         planId: "3",
//         name: "Pro Monthly",
//         type: "subscription",
//         subscriptionMonthlyAmount: 9.99,
//     },
//     {
//         planId: "4",
//         name: "Pro Yearly",
//         type: "subscription",
//         subscriptionMonthlyAmount: 9.99,
//         subscriptionYearlyAmount: 99.99,
//     },
//     {
//         planId: "5",
//         name: "Flexible Pay",
//         type: "emi",
//         emiAmount: 20,
//         emiTotalInstallments: 6,
//     },
// ];

const formSchema = z
    .object({
        name: z.string().min(1, "Name is required"),
        type: z.enum([
            paymentPlanType.FREE,
            paymentPlanType.ONE_TIME,
            paymentPlanType.SUBSCRIPTION,
            paymentPlanType.EMI,
        ] as const),
        oneTimeAmount: z
            .number()
            .min(0, "Amount cannot be negative")
            .optional(),
        emiAmount: z.number().min(0, "Amount cannot be negative").optional(),
        emiTotalInstallments: z
            .number()
            .min(0, "Installments cannot be negative")
            .optional(),
        subscriptionMonthlyAmount: z
            .number()
            .min(0, "Amount cannot be negative")
            .optional(),
        subscriptionYearlyAmount: z
            .number()
            .min(0, "Amount cannot be negative")
            .optional(),
        subscriptionType: z.enum(["monthly", "yearly"] as const).optional(),
    })
    .refine(
        (data) => {
            if (data.type === paymentPlanType.SUBSCRIPTION) {
                if (data.subscriptionType === "monthly") {
                    return (
                        data.subscriptionMonthlyAmount !== undefined &&
                        data.subscriptionMonthlyAmount > 0
                    );
                }
                if (data.subscriptionType === "yearly") {
                    return (
                        data.subscriptionYearlyAmount !== undefined &&
                        data.subscriptionYearlyAmount > 0
                    );
                }
            }
            if (data.type === paymentPlanType.ONE_TIME) {
                return (
                    data.oneTimeAmount !== undefined && data.oneTimeAmount > 0
                );
            }
            if (data.type === paymentPlanType.EMI) {
                return (
                    data.emiAmount !== undefined &&
                    data.emiAmount > 0 &&
                    data.emiTotalInstallments !== undefined &&
                    data.emiTotalInstallments > 0
                );
            }
            return true;
        },
        {
            message:
                "Please fill in all required fields for the selected plan type",
            path: ["type"],
        },
    );

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
    onPlanSubmit,
    onPlanArchived,
    allowedPlanTypes = [
        paymentPlanType.FREE,
        paymentPlanType.ONE_TIME,
        paymentPlanType.SUBSCRIPTION,
        paymentPlanType.EMI,
    ],
    currencySymbol = "$",
    currencyISOCode = "USD",
}: {
    paymentPlans: PaymentPlan[];
    onPlanSubmit: (values: z.infer<typeof formSchema>) => void;
    onPlanArchived: (planId: PaymentPlan["planId"]) => void;
    allowedPlanTypes: PaymentPlanType[];
    currencySymbol?: string;
    currencyISOCode?: string;
}) {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [planType, setPlanType] = useState<PaymentPlanType>(
        paymentPlanType.FREE,
    );
    const [planToArchive, setPlanToArchive] = useState<PaymentPlan | null>(
        null,
    );
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [subscriptionType, setSubscriptionType] = useState<
        "monthly" | "yearly"
    >("monthly");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: paymentPlanType.FREE,
            oneTimeAmount: 0,
            emiAmount: 0,
            emiTotalInstallments: 0,
            subscriptionMonthlyAmount: 0,
            subscriptionYearlyAmount: 0,
            subscriptionType: "monthly",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        onPlanSubmit(values);
        handleFormVisibility(false);
    }

    function handleArchive(plan: PaymentPlan) {
        onPlanArchived(plan.planId);
        setPlanToArchive(null);
        setIsDialogOpen(false);
    }

    function handleFormVisibility(visible: boolean) {
        setIsFormVisible(visible);
        if (!visible) {
            setPlanType(paymentPlanType.FREE);
            setSubscriptionType("monthly");
            form.reset();
        }
    }

    return (
        <div className="w-full max-w-md mx-auto p-2 space-y-2">
            <div className="space-y-2">
                {paymentPlans.map((plan) => (
                    <div
                        key={plan.planId}
                        className="p-2 border rounded-md bg-background hover:border-primary/50 transition-colors"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-medium">{plan.name}</h3>
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
                                                        setPlanToArchive(plan);
                                                        setIsDialogOpen(true);
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
                                            Are you sure you want to archive
                                            this plan?
                                        </DialogTitle>
                                        <DialogDescription>
                                            This action cannot be undone. This
                                            will permanently archive the payment
                                            plan &quot;{planToArchive?.name}
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
                                                handleArchive(planToArchive)
                                            }
                                        >
                                            Archive
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs">
                                {typeof getPlanAmount(plan, currencySymbol) ===
                                "string"
                                    ? getPlanAmount(plan, currencySymbol)
                                    : `${getPlanAmount(plan, currencySymbol).amount} × ${getPlanAmount(plan, currencySymbol).installments}`}
                            </span>
                            <Badge
                                variant="secondary"
                                className="rounded-full px-1.5 py-0.5 text-[10px]"
                            >
                                {getPlanTypeLabel(plan)}
                            </Badge>
                        </div>
                    </div>
                ))}
                {!isFormVisible ? (
                    <div
                        onClick={() => handleFormVisibility(true)}
                        className="p-2 border border-dashed rounded-md bg-background hover:border-primary/50 transition-colors group cursor-pointer mt-4"
                    >
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
                ) : (
                    <div className="p-4 border rounded-md bg-background mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                Create New Plan
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFormVisibility(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plan Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter plan name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plan Type</FormLabel>
                                            <Select
                                                onValueChange={(
                                                    value: PaymentPlanType,
                                                ) => {
                                                    field.onChange(value);
                                                    setPlanType(value);
                                                }}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a plan type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {allowedPlanTypes.includes(
                                                        paymentPlanType.FREE,
                                                    ) && (
                                                        <SelectItem
                                                            value={
                                                                paymentPlanType.FREE
                                                            }
                                                        >
                                                            Free
                                                        </SelectItem>
                                                    )}
                                                    {allowedPlanTypes.includes(
                                                        paymentPlanType.EMI,
                                                    ) && (
                                                        <SelectItem
                                                            value={
                                                                paymentPlanType.EMI
                                                            }
                                                        >
                                                            EMI
                                                        </SelectItem>
                                                    )}
                                                    {allowedPlanTypes.includes(
                                                        paymentPlanType.SUBSCRIPTION,
                                                    ) && (
                                                        <SelectItem
                                                            value={
                                                                paymentPlanType.SUBSCRIPTION
                                                            }
                                                        >
                                                            Subscription
                                                        </SelectItem>
                                                    )}
                                                    {allowedPlanTypes.includes(
                                                        paymentPlanType.ONE_TIME,
                                                    ) && (
                                                        <SelectItem
                                                            value={
                                                                paymentPlanType.ONE_TIME
                                                            }
                                                        >
                                                            One-time
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {planType === paymentPlanType.ONE_TIME && (
                                    <FormField
                                        control={form.control}
                                        name="oneTimeAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    One-time Amount (Required)
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center border rounded-md">
                                                        <span className="text-muted-foreground text-sm pl-2">
                                                            {currencySymbol}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            className="border-0 focus-visible:ring-0 focus:outline-none"
                                                            placeholder="Enter amount"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    parseFloat(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                        <span className="text-muted-foreground text-sm pr-2">
                                                            {currencyISOCode}
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {planType === paymentPlanType.EMI && (
                                    <FormField
                                        control={form.control}
                                        name="emiDetails"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>
                                                    Monthly payments (All fields
                                                    required)
                                                </FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name="emiTotalInstallments"
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <div className="flex items-center border rounded-md">
                                                                            <Input
                                                                                type="number"
                                                                                className="border-0 focus-visible:ring-0 focus:outline-none"
                                                                                {...field}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    field.onChange(
                                                                                        parseInt(
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                                placeholder="Enter number"
                                                                            />
                                                                            <span className="text-muted-foreground text-sm pr-2">
                                                                                payments
                                                                            </span>
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        ×
                                                    </span>
                                                    <div className="flex-1">
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name="emiAmount"
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <div className="flex items-center border rounded-md">
                                                                            <span className="text-muted-foreground text-sm pl-2">
                                                                                {
                                                                                    currencySymbol
                                                                                }
                                                                            </span>
                                                                            <Input
                                                                                type="number"
                                                                                className="border-0 focus-visible:ring-0 focus:outline-none"
                                                                                {...field}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    field.onChange(
                                                                                        parseFloat(
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                                placeholder="Enter amount"
                                                                            />
                                                                            <span className="text-muted-foreground text-sm pr-2">
                                                                                {
                                                                                    currencyISOCode
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-2">
                                                    <span className="text-muted-foreground text-sm mr-1">
                                                        Total:
                                                    </span>
                                                    <span className="font-medium">
                                                        {currencySymbol}
                                                        {(form.watch(
                                                            "emiAmount",
                                                        ) || 0) *
                                                            (form.watch(
                                                                "emiTotalInstallments",
                                                            ) || 0)}
                                                    </span>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {planType === paymentPlanType.SUBSCRIPTION && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="subscriptionType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Subscription Type
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={(
                                                            value:
                                                                | "monthly"
                                                                | "yearly",
                                                        ) => {
                                                            field.onChange(
                                                                value,
                                                            );
                                                            setSubscriptionType(
                                                                value,
                                                            );
                                                        }}
                                                        defaultValue={
                                                            field.value
                                                        }
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select subscription type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="monthly">
                                                                Monthly
                                                            </SelectItem>
                                                            <SelectItem value="yearly">
                                                                Yearly
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {subscriptionType && (
                                            <>
                                                {subscriptionType ===
                                                    "monthly" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="subscriptionMonthlyAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Monthly
                                                                    Subscription
                                                                    Amount
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center border rounded-md">
                                                                        <span className="text-muted-foreground text-sm pl-2">
                                                                            {
                                                                                currencySymbol
                                                                            }
                                                                        </span>
                                                                        <Input
                                                                            type="number"
                                                                            className="border-0 focus-visible:ring-0 focus:outline-none"
                                                                            placeholder="Enter monthly amount"
                                                                            {...field}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                field.onChange(
                                                                                    parseFloat(
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    ),
                                                                                )
                                                                            }
                                                                        />
                                                                        <span className="text-muted-foreground text-sm pr-2">
                                                                            {
                                                                                currencyISOCode
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                                {subscriptionType ===
                                                    "yearly" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="subscriptionYearlyAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Yearly
                                                                    Subscription
                                                                    Amount
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center border rounded-md">
                                                                        <span className="text-muted-foreground text-sm pl-2">
                                                                            {
                                                                                currencySymbol
                                                                            }
                                                                        </span>
                                                                        <Input
                                                                            type="number"
                                                                            className="border-0 focus-visible:ring-0 focus:outline-none"
                                                                            placeholder="Enter yearly amount"
                                                                            {...field}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                field.onChange(
                                                                                    parseFloat(
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    ),
                                                                                )
                                                                            }
                                                                        />
                                                                        <span className="text-muted-foreground text-sm pr-2">
                                                                            {
                                                                                currencyISOCode
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                                <Button type="submit">
                                    Create Payment Plan
                                </Button>
                            </form>
                        </Form>
                    </div>
                )}
            </div>
        </div>
    );
}
