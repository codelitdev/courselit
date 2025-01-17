"use client";

import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, ChevronUp, ShoppingCart } from "lucide-react";
import { LoginForm } from "./login-form";
import {
    PaymentPlan,
    Constants,
    MembershipEntityType,
    UIConstants,
    MembershipStatus,
} from "@courselit/common-models";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { getSymbolFromCurrency, useToast } from "@courselit/components-library";
import { getPlanPrice } from "@ui-lib/utils";
const { PaymentPlanType: paymentPlanType } = Constants;

export interface Product {
    id: string;
    name: string;
    type: MembershipEntityType;
    slug?: string;
    featuredImage?: string;
    description?: string;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
}

export interface CheckoutScreenProps {
    product: Product;
    paymentPlans: PaymentPlan[];
}

const formSchema = z.object({
    selectedPlan: z.string().min(1, "Please select a plan"),
    joiningReason: z.string().optional(),
});

function getPlanDescription(plan: PaymentPlan, currencySymbol: string): string {
    if (!plan) {
        return "N/A";
    }

    switch (plan.type) {
        case paymentPlanType.FREE:
            return "Free plan";
        case paymentPlanType.ONE_TIME:
            return `One-time payment of ${currencySymbol}${plan.oneTimeAmount?.toFixed(2)}`;
        case paymentPlanType.SUBSCRIPTION:
            if (plan.subscriptionYearlyAmount) {
                return `Billed annually at ${currencySymbol}${plan.subscriptionYearlyAmount.toFixed(2)}`;
            }
            return `${currencySymbol}${plan.subscriptionMonthlyAmount?.toFixed(2)} per month`;
        case paymentPlanType.EMI:
            return `${currencySymbol}${plan.emiAmount?.toFixed(2)} per month for ${plan.emiTotalInstallments} months`;
        default:
            return "N/A";
    }
}

export default function Checkout({
    product,
    paymentPlans,
}: CheckoutScreenProps) {
    const siteinfo = useContext(SiteInfoContext);
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const currencySymbol =
        getSymbolFromCurrency(siteinfo.currencyISOCode || "USD") || "$";

    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
    const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(!!profile?.email);
    const [userEmail, setUserEmail] = useState(profile?.email || "");
    const [userName, setUserName] = useState(profile?.name || "");
    const [membershipStatus, setMembershipStatus] = useState<
        MembershipStatus | undefined
    >();

    const stripePromise = loadStripe(siteinfo.stripeKey as string);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchMembership = async () => {
            const query = `
                query ($entityId: String!, $entityType: MembershipEntityType!) {
                    membershipStatus: getMembershipStatus(entityId: $entityId, entityType: $entityType)
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true)
                .setPayload({
                    query,
                    variables: {
                        entityId: product.id,
                        entityType: product.type.toUpperCase(),
                    },
                })
                .build();

            try {
                const response = await fetch.exec();
                if (response.membershipStatus) {
                    setMembershipStatus(
                        response.membershipStatus.toLowerCase(),
                    );
                }
            } catch (err) {
                toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
            }
        };

        if (profile.userId) {
            fetchMembership();
        }
    }, [profile]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            selectedPlan: "",
            joiningReason: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const { paymentMethod } = siteinfo;

        let payload: Record<string, unknown> | null = {
            joiningReason: values.joiningReason,
        };

        if (paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE) {
            payload["id"] = product.id;
            payload["type"] = product.type;
            payload["planId"] = selectedPlan!.planId;
            payload["origin"] = address.frontend;
        }

        if (paymentMethod === UIConstants.PAYMENT_METHOD_RAZORPAY) {
            payload["id"] = product.id;
            payload["type"] = product.type;
            payload["planId"] = selectedPlan!.planId;
            payload["origin"] = address.frontend;
        }

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/initiate-new`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify(payload))
            .build();

        try {
            const response = await fetch.exec();
            if (response.status === "initiated") {
                if (paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE) {
                    await redirectToStripeCheckout({
                        stripe: await stripePromise,
                        sessionId: response.paymentTracker,
                    });
                }
            } else if (response.status === "success") {
                if (product.type === Constants.MembershipEntityType.COMMUNITY) {
                    router.replace(
                        `/dashboard4/community/${product.id}?success=true`,
                    );
                }
                if (product.type === Constants.MembershipEntityType.COURSE) {
                    router.replace(`/course/${product.id}?success=true`);
                }
            }
        } catch (err) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    }

    const redirectToStripeCheckout = async ({
        stripe,
        sessionId,
    }: {
        stripe: any;
        sessionId: string;
    }) => {
        const result = await stripe.redirectToCheckout({
            sessionId,
        });
        if (result.error) {
        }
    };

    const handlePlanSelection = (planId: string) => {
        const plan = paymentPlans.find((p) => p.planId === planId);
        setSelectedPlan(plan || null);
        form.setValue("selectedPlan", planId);
    };

    const handleLoginComplete = (email: string, name: string) => {
        setIsLoggedIn(true);
        setUserEmail(email);
        setUserName(name);
    };

    const MobileOrderSummary = () => (
        <div className="md:hidden w-full">
            <div className="sticky top-0 bg-gray-100 z-10 w-full">
                <div className="flex items-center justify-between p-4 bg-background border-b w-full">
                    <div className="flex items-center gap-1">
                        <ShoppingCart className="h-5 w-5" />
                        <Button
                            variant="ghost"
                            className="p-0 h-auto font-normal hover:bg-transparent flex items-center"
                            onClick={() =>
                                setIsOrderSummaryOpen(!isOrderSummaryOpen)
                            }
                        >
                            {isOrderSummaryOpen ? "Hide" : "Show"} order summary
                            <ChevronUp
                                className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOrderSummaryOpen ? "" : "rotate-180"}`}
                            />
                        </Button>
                    </div>
                    <div className="font-medium flex items-center">
                        {currencySymbol}
                        {getPlanPrice(
                            selectedPlan || paymentPlans[0],
                        ).amount.toFixed(2)}
                        <span className="text-sm text-muted-foreground ml-1">
                            {
                                getPlanPrice(selectedPlan || paymentPlans[0])
                                    .period
                            }
                        </span>
                    </div>
                </div>
            </div>

            <Collapsible
                open={isOrderSummaryOpen}
                onOpenChange={setIsOrderSummaryOpen}
            >
                <CollapsibleTrigger className="sr-only">
                    Toggle order summary
                </CollapsibleTrigger>
                <CollapsibleContent className="border-b bg-gray-100">
                    <div className="p-4 space-y-4">
                        <div className="flex gap-4">
                            <div className="h-16 w-16 relative rounded-lg overflow-hidden bg-white">
                                <Image
                                    src={
                                        product.featuredImage ||
                                        "/courselit_backdrop_square.webp"
                                    }
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="font-medium">{product.name}</h3>
                                {product.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {product.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {selectedPlan && (
                            <div className="space-y-4">
                                <div className="flex justify-between pt-4 border-t">
                                    <span className="font-medium">Total</span>
                                    <div className="text-right flex items-center">
                                        <div className="font-medium">
                                            {currencySymbol}
                                            {getPlanPrice(
                                                selectedPlan,
                                            ).amount.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-muted-foreground ml-1">
                                            {getPlanPrice(selectedPlan).period}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );

    const DesktopOrderSummary = () => (
        <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Order summary</h2>
            <div className="flex items-start gap-4 pb-4">
                <div className="h-16 w-16 relative rounded-lg overflow-hidden bg-gray-100">
                    <Image
                        src={
                            product.featuredImage ||
                            "/courselit_backdrop_square.webp"
                        }
                        alt={product.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.description && (
                        <p className="text-sm text-muted-foreground">
                            {product.description}
                        </p>
                    )}
                </div>
            </div>
            {selectedPlan && (
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Total</span>
                        <span className="font-medium">
                            {currencySymbol}
                            {getPlanPrice(selectedPlan).amount.toFixed(2)}
                            <span className="text-sm text-muted-foreground ml-1">
                                {getPlanPrice(selectedPlan).period}
                            </span>
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {getPlanDescription(selectedPlan, currencySymbol)}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background w-full">
            <div className="w-full">
                <MobileOrderSummary />
                <div className="w-full grid md:grid-cols-[1fr,400px] gap-8 items-start px-4 py-8">
                    <div className="space-y-8">
                        {membershipStatus ===
                            Constants.MembershipStatus.ACTIVE ||
                        membershipStatus ===
                            Constants.MembershipStatus.REJECTED ? (
                            <div className="">
                                <h2 className="text-lg mb-4 flex items-center font-semibold gap-2">
                                    <Check /> Already owned
                                </h2>
                                <p className="text-muted-foreground mb-8">
                                    You already have access to this resource.
                                </p>
                                <Button
                                    onClick={() => {
                                        if (
                                            product.type ===
                                            Constants.MembershipEntityType
                                                .COMMUNITY
                                        ) {
                                            router.replace(
                                                `/dashboard4/community/${product.id}`,
                                            );
                                        } else if (
                                            product.type ===
                                            Constants.MembershipEntityType
                                                .COURSE
                                        ) {
                                            router.replace(
                                                `/course/${product.id}`,
                                            );
                                        }
                                    }}
                                    className="bg-black text-white hover:bg-black/90"
                                >
                                    Go to the resource
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-base font-semibold mb-2">
                                        Personal Information
                                    </h2>
                                    {!isLoggedIn ? (
                                        <LoginForm
                                            onLoginComplete={
                                                handleLoginComplete
                                            }
                                        />
                                    ) : (
                                        <div className="text-sm space-y-2">
                                            <p>
                                                <span className="font-semibold">
                                                    Email:
                                                </span>{" "}
                                                {userEmail}
                                            </p>
                                            <p>
                                                <span className="font-semibold">
                                                    Name:
                                                </span>{" "}
                                                {userName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <FormProvider {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        className="space-y-6"
                                    >
                                        <div className="mb-6">
                                            <h2 className="text-base font-semibold mb-4">
                                                Select Payment Plan
                                            </h2>
                                            <FormField
                                                control={form.control}
                                                name="selectedPlan"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormControl>
                                                            <RadioGroup
                                                                onValueChange={(
                                                                    value,
                                                                ) => {
                                                                    field.onChange(
                                                                        value,
                                                                    );
                                                                    handlePlanSelection(
                                                                        value,
                                                                    );
                                                                }}
                                                                defaultValue={
                                                                    field.value
                                                                }
                                                                className="space-y-3"
                                                            >
                                                                {paymentPlans.map(
                                                                    (plan) => (
                                                                        <FormItem
                                                                            key={
                                                                                plan.planId
                                                                            }
                                                                            className="flex items-start space-x-3 space-y-0"
                                                                        >
                                                                            <FormControl>
                                                                                <RadioGroupItem
                                                                                    value={
                                                                                        plan.planId
                                                                                    }
                                                                                    disabled={
                                                                                        !isLoggedIn
                                                                                    }
                                                                                />
                                                                            </FormControl>
                                                                            <div className="space-y-0.5">
                                                                                <FormLabel className="text-base font-normal">
                                                                                    {
                                                                                        plan.name
                                                                                    }
                                                                                </FormLabel>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    {getPlanDescription(
                                                                                        plan,
                                                                                        currencySymbol,
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        </FormItem>
                                                                    ),
                                                                )}
                                                            </RadioGroup>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        {selectedPlan?.type ===
                                            paymentPlanType.FREE &&
                                            product.type ===
                                                Constants.MembershipEntityType
                                                    .COMMUNITY && (
                                                <FormField
                                                    control={form.control}
                                                    name="joiningReason"
                                                    render={({ field }) => (
                                                        <FormItem className="mb-6">
                                                            <FormLabel className="text-sm font-semibold mb-4">
                                                                {product.joiningReasonText ||
                                                                    "Reason for joining"}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <textarea
                                                                    className="w-full border rounded p-2"
                                                                    {...field}
                                                                    placeholder="Please provide your reason for joining"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        <Button
                                            type="submit"
                                            className="w-full bg-black text-white hover:bg-black/90"
                                            disabled={
                                                !isLoggedIn ||
                                                !form.formState.isValid ||
                                                (selectedPlan?.type ===
                                                    paymentPlanType.FREE &&
                                                    product.type ===
                                                        Constants
                                                            .MembershipEntityType
                                                            .COMMUNITY &&
                                                    !form.getValues(
                                                        "joiningReason",
                                                    ))
                                            }
                                        >
                                            Complete Purchase
                                        </Button>
                                    </form>
                                </FormProvider>
                            </>
                        )}
                    </div>
                    <div className="hidden md:block">
                        <DesktopOrderSummary />
                    </div>
                </div>
            </div>
        </div>
    );
}
