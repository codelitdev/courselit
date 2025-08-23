"use client";

import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Check, ChevronUp, ShoppingCart, X, Star, Package } from "lucide-react";
import { LoginForm } from "./login-form";
import {
    PaymentPlan,
    Constants,
    MembershipEntityType,
    UIConstants,
    MembershipStatus,
    Course,
} from "@courselit/common-models";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    ThemeContext,
} from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { getSymbolFromCurrency, useToast } from "@courselit/components-library";
import { getPlanPrice } from "@ui-lib/utils";
import Script from "next/script";
import {
    Button,
    Header3,
    Header4,
    PageCard,
    PageCardContent,
    Text1,
} from "@courselit/page-primitives";
import { CHECKOUT_PAGE_ORDER_SUMMARY } from "@ui-config/strings";
const { PaymentPlanType: paymentPlanType } = Constants;

interface PaymentPlanCardProps {
    plan: PaymentPlan;
    isSelected: boolean;
    isRecommended: boolean;
    isLoggedIn: boolean;
    currencySymbol: string;
    includedProducts: Course[];
    theme: any;
    onSelect: (planId: string) => void;
}

function PaymentPlanCard({
    plan,
    isSelected,
    isRecommended,
    isLoggedIn,
    currencySymbol,
    includedProducts,
    theme,
    onSelect,
}: PaymentPlanCardProps) {
    const planPrice = getPlanPrice(plan);
    const planIncludedProducts = getIncludedProductsDescription(
        plan,
        includedProducts,
    );

    return (
        <FormItem className="space-y-0">
            <FormControl>
                <PageCard
                    theme={theme.theme}
                    className={`relative transition-all ${
                        isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : isLoggedIn
                              ? "hover:border-muted-foreground/50"
                              : ""
                    } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => {
                        if (isLoggedIn) {
                            onSelect(plan.planId);
                        }
                    }}
                >
                    <PageCardContent theme={theme.theme}>
                        {/* Recommended Badge */}
                        {isRecommended && (
                            <div className="absolute -top-3 left-6">
                                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Recommended
                                </div>
                            </div>
                        )}

                        {/* Radio Button and Plan Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <RadioGroupItem
                                    value={plan.planId}
                                    disabled={!isLoggedIn}
                                    className="mt-1"
                                />
                                <div>
                                    <FormLabel className="text-lg font-semibold cursor-pointer">
                                        {plan.name}
                                    </FormLabel>
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-foreground">
                                    {currencySymbol}
                                    {planPrice.amount.toFixed(2)}
                                </span>
                                {planPrice.period && (
                                    <span className="text-muted-foreground text-sm">
                                        {planPrice.period}
                                    </span>
                                )}
                            </div>
                            {plan.type === paymentPlanType.ONE_TIME && (
                                <span className="text-sm text-muted-foreground">
                                    one-time
                                </span>
                            )}
                        </div>

                        {/* Features */}
                        <div className="space-y-3">
                            {/* Included Products Count */}
                            {planIncludedProducts.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                    <span>
                                        {planIncludedProducts.length} products
                                        included
                                    </span>
                                </div>
                            )}

                            {/* Real included product chips */}
                            {planIncludedProducts.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {planIncludedProducts.map((product) => (
                                        <span
                                            key={product.courseId}
                                            className="px-3 py-1 border border-border bg-background text-foreground rounded text-sm"
                                        >
                                            {product.title}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {plan.description && (
                            <div className="mt-4">
                                <Text1
                                    theme={theme.theme}
                                    className="text-sm text-muted-foreground whitespace-pre-wrap"
                                >
                                    {plan.description}
                                </Text1>
                            </div>
                        )}
                    </PageCardContent>
                </PageCard>
            </FormControl>
        </FormItem>
    );
}

interface OrderSummaryProps {
    product: Product;
    selectedPlan: PaymentPlan | null;
    paymentPlans: PaymentPlan[];
    currencySymbol: string;
    theme: any;
    isOrderSummaryOpen: boolean;
    setIsOrderSummaryOpen: (open: boolean) => void;
}

function MobileOrderSummary({
    product,
    selectedPlan,
    paymentPlans,
    currencySymbol,
    theme,
    isOrderSummaryOpen,
    setIsOrderSummaryOpen,
}: OrderSummaryProps) {
    return (
        <div className="md:hidden w-full sticky top-20 z-11 mb-8">
            <PageCard theme={theme.theme}>
                <PageCardContent theme={theme.theme} className="p-0">
                    <div className="w-full">
                        <div
                            className="flex items-center justify-between p-4 border-b w-full"
                            style={{
                                borderBottomColor: theme.theme.colors.border,
                            }}
                        >
                            <div className="flex items-center gap-1">
                                <ShoppingCart className="h-5 w-5" />
                                <Text1
                                    className="p-0 !m-0 h-auto font-normal hover:bg-transparent flex items-center"
                                    onClick={() =>
                                        setIsOrderSummaryOpen(
                                            !isOrderSummaryOpen,
                                        )
                                    }
                                    theme={theme.theme}
                                >
                                    {isOrderSummaryOpen ? "Hide" : "Show"} order
                                    summary
                                    <ChevronUp
                                        className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOrderSummaryOpen ? "" : "rotate-180"}`}
                                    />
                                </Text1>
                            </div>
                            <div className="font-medium flex items-center">
                                {currencySymbol}
                                {getPlanPrice(
                                    selectedPlan || paymentPlans[0],
                                ).amount.toFixed(2)}
                                <span className="text-sm text-muted-foreground ml-1">
                                    {
                                        getPlanPrice(
                                            selectedPlan || paymentPlans[0],
                                        ).period
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
                        <CollapsibleContent
                            style={{
                                borderBottomColor: theme.theme.colors.border,
                            }}
                        >
                            <div className="p-4 space-y-4">
                                <div className="flex gap-4">
                                    <div className="h-16 w-16 relative rounded-lg overflow-hidden">
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
                                        <Header3 theme={theme.theme}>
                                            {product.name}
                                        </Header3>
                                        {product.description && (
                                            <Text1 theme={theme.theme}>
                                                {product.description}
                                            </Text1>
                                        )}
                                    </div>
                                </div>

                                {selectedPlan && (
                                    <div className="space-y-4">
                                        <div
                                            className="flex justify-between pt-4 border-t"
                                            style={{
                                                borderTopColor:
                                                    theme.theme.colors.border,
                                            }}
                                        >
                                            <Header3 theme={theme.theme}>
                                                Total
                                            </Header3>
                                            <div className="text-right flex items-center">
                                                <Header4 className="font-medium">
                                                    {currencySymbol}
                                                    {getPlanPrice(
                                                        selectedPlan,
                                                    ).amount.toFixed(2)}
                                                </Header4>
                                                <Text1 theme={theme.theme}>
                                                    {
                                                        getPlanPrice(
                                                            selectedPlan,
                                                        ).period
                                                    }
                                                </Text1>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </PageCardContent>
            </PageCard>
        </div>
    );
}

function DesktopOrderSummary({
    product,
    selectedPlan,
    currencySymbol,
    theme,
}: Omit<
    OrderSummaryProps,
    "paymentPlans" | "isOrderSummaryOpen" | "setIsOrderSummaryOpen"
>) {
    return (
        <PageCard theme={theme.theme}>
            <PageCardContent theme={theme.theme} className="space-y-4">
                <Header3 theme={theme.theme}>
                    {CHECKOUT_PAGE_ORDER_SUMMARY}
                </Header3>
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
                        <Header4 theme={theme.theme}>{product.name}</Header4>
                        {product.description && (
                            <Text1 theme={theme.theme}>
                                {product.description}
                            </Text1>
                        )}
                    </div>
                </div>
                {selectedPlan && (
                    <div
                        className="mt-4 pt-4 border-t"
                        style={{
                            borderTopColor: theme.theme.colors.border,
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <Header4 theme={theme.theme}>Total</Header4>
                            <Header4 theme={theme.theme}>
                                {currencySymbol}
                                {getPlanPrice(selectedPlan).amount.toFixed(2)}
                                <span className="text-sm text-muted-foreground ml-1">
                                    {getPlanPrice(selectedPlan).period}
                                </span>
                            </Header4>
                        </div>
                        <Text1 theme={theme.theme}>
                            {getPlanDescription(selectedPlan, currencySymbol)}
                        </Text1>
                    </div>
                )}
            </PageCardContent>
        </PageCard>
    );
}

export interface Product {
    id: string;
    name: string;
    type: MembershipEntityType;
    defaultPaymentPlanId: string;
    slug?: string;
    featuredImage?: string;
    description?: string;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
}

export interface CheckoutScreenProps {
    product: Product;
    paymentPlans: PaymentPlan[];
    includedProducts: Course[];
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

function getIncludedProductsDescription(
    plan: PaymentPlan,
    includedProducts: Course[],
): Course[] {
    if (!plan) {
        return [];
    }

    if (plan.includedProducts && plan.includedProducts.length > 0) {
        const includedProductsList = includedProducts.filter((product) =>
            plan.includedProducts?.includes(product.courseId),
        );
        return includedProductsList;
    }

    return [];
}

export default function Checkout({
    product,
    paymentPlans,
    includedProducts,
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const stripePromise = loadStripe(siteinfo.stripeKey as string);
    const router = useRouter();
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);

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

    // Initialize selectedPlan with the default payment plan
    useEffect(() => {
        if (paymentPlans.length > 0 && product.defaultPaymentPlanId) {
            const defaultPlan = paymentPlans.find(
                (plan) => plan.planId === product.defaultPaymentPlanId,
            );
            if (defaultPlan) {
                setSelectedPlan(defaultPlan);
            }
        }
    }, [paymentPlans, product.defaultPaymentPlanId]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            selectedPlan: product.defaultPaymentPlanId || "",
            joiningReason: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        const { paymentMethod } = siteinfo;

        let payload: Record<string, unknown> | null = {
            joiningReason: values.joiningReason,
            id: product.id,
            type: product.type,
            planId: selectedPlan!.planId,
            origin: address.frontend,
        };

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/initiate`)
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
                if (paymentMethod === UIConstants.PAYMENT_METHOD_RAZORPAY) {
                    const razorpayPayload = {
                        key: siteinfo.razorpayKey,
                        name: product.name,
                        image: product.featuredImage || siteinfo.logo?.file,
                        prefill: {
                            email: profile.email,
                        },
                        handler: function (response) {
                            verifySignature(response);
                        },
                    };
                    if (
                        selectedPlan?.type === paymentPlanType.SUBSCRIPTION ||
                        selectedPlan?.type === paymentPlanType.EMI
                    ) {
                        razorpayPayload["subscription_id"] =
                            response.paymentTracker;
                    } else {
                        razorpayPayload["order_id"] = response.paymentTracker;
                        // razorpayPayload["handler"] = function (response) {
                        //     verifySignature(response);
                        // }
                    }
                    // @ts-ignore
                    const rzp1 = new Razorpay(razorpayPayload);
                    rzp1.open();
                }
                if (paymentMethod === UIConstants.PAYMENT_METHOD_LEMONSQUEEZY) {
                    (window as any).LemonSqueezy.Url.Open(
                        response.paymentTracker,
                    );
                }
            } else if (response.status === "success") {
                if (product.type === Constants.MembershipEntityType.COMMUNITY) {
                    router.replace(
                        `/dashboard/community/${product.id}?success=true`,
                    );
                }
                if (product.type === Constants.MembershipEntityType.COURSE) {
                    router.replace(
                        `/course/${product.slug}/${product.id}?success=true`,
                    );
                }
            }
        } catch (err) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const verifySignature = async (response) => {
        const payload = {
            signature: response.razorpay_signature,
            paymentId: response.razorpay_payment_id,
        };
        if (
            selectedPlan?.type === paymentPlanType.SUBSCRIPTION ||
            selectedPlan?.type === paymentPlanType.EMI
        ) {
            payload["subscriptionId"] = response.razorpay_subscription_id;
        } else {
            payload["orderId"] = response.razorpay_order_id;
        }
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/vendor/razorpay/verify-new`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify(payload))
            .build();

        try {
            const verifyResponse = await fetch.exec();
            router.replace(`/checkout/verify?id=${verifyResponse.purchaseId}`);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

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

    useEffect(() => {
        function setupLemonSqueezy() {
            if (typeof (window as any).createLemonSqueezy !== "undefined") {
                (window as any).createLemonSqueezy();
            }
        }

        if (
            siteinfo.paymentMethod === UIConstants.PAYMENT_METHOD_LEMONSQUEEZY
        ) {
            setupLemonSqueezy();
        }
    }, [siteinfo, (window as any).createLemonSqueezy]);

    return (
        <div className="min-h-screen w-full">
            <div className="w-full">
                <MobileOrderSummary
                    product={product}
                    selectedPlan={selectedPlan}
                    paymentPlans={paymentPlans}
                    currencySymbol={currencySymbol}
                    theme={theme}
                    isOrderSummaryOpen={isOrderSummaryOpen}
                    setIsOrderSummaryOpen={setIsOrderSummaryOpen}
                />
                <div className="w-full grid md:grid-cols-[1fr,400px] gap-8 items-start">
                    <div className="space-y-8">
                        {membershipStatus ===
                            Constants.MembershipStatus.ACTIVE ||
                        membershipStatus ===
                            Constants.MembershipStatus.REJECTED ? (
                            <div className="space-y-4">
                                <Header3 theme={theme.theme}>
                                    {membershipStatus ===
                                    Constants.MembershipStatus.ACTIVE ? (
                                        <Check />
                                    ) : (
                                        <X />
                                    )}
                                    {membershipStatus ===
                                    Constants.MembershipStatus.ACTIVE
                                        ? "Already owned"
                                        : "Access Denied"}
                                </Header3>
                                <Text1 theme={theme.theme}>
                                    {membershipStatus ===
                                    Constants.MembershipStatus.ACTIVE
                                        ? "You already have access to this resource."
                                        : "You have been rejected and cannot proceed with the checkout."}
                                </Text1>
                                {membershipStatus ===
                                    Constants.MembershipStatus.ACTIVE && (
                                    <Button
                                        onClick={() => {
                                            if (
                                                product.type ===
                                                Constants.MembershipEntityType
                                                    .COMMUNITY
                                            ) {
                                                router.replace(
                                                    `/dashboard/community/${product.id}`,
                                                );
                                            } else if (
                                                product.type ===
                                                Constants.MembershipEntityType
                                                    .COURSE
                                            ) {
                                                router.replace(
                                                    `/course/${product.slug}/${product.id}`,
                                                );
                                            }
                                        }}
                                        theme={theme.theme}
                                    >
                                        Go to the resource
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <Header3 theme={theme.theme}>
                                        Personal Information
                                    </Header3>
                                    {!isLoggedIn ? (
                                        <LoginForm
                                            onLoginComplete={
                                                handleLoginComplete
                                            }
                                        />
                                    ) : (
                                        <div className="text-sm space-y-2">
                                            <Text1 theme={theme.theme}>
                                                <span className="font-semibold">
                                                    Email:
                                                </span>{" "}
                                                {userEmail}
                                            </Text1>
                                            <Text1 theme={theme.theme}>
                                                <span className="font-semibold">
                                                    Name:
                                                </span>{" "}
                                                {userName}
                                            </Text1>
                                        </div>
                                    )}
                                </div>
                                <FormProvider {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        className="space-y-6"
                                    >
                                        <div className="mb-6 space-y-4">
                                            <Header3 theme={theme.theme}>
                                                Select Your Plan
                                            </Header3>
                                            <FormField
                                                control={form.control}
                                                name="selectedPlan"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-4">
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
                                                                value={
                                                                    field.value
                                                                }
                                                                className="space-y-4"
                                                            >
                                                                {paymentPlans.map(
                                                                    (plan) => {
                                                                        const isRecommended =
                                                                            plan.planId ===
                                                                            product.defaultPaymentPlanId;

                                                                        return (
                                                                            <PaymentPlanCard
                                                                                key={
                                                                                    plan.planId
                                                                                }
                                                                                plan={
                                                                                    plan
                                                                                }
                                                                                isSelected={
                                                                                    field.value ===
                                                                                    plan.planId
                                                                                }
                                                                                isRecommended={
                                                                                    isRecommended
                                                                                }
                                                                                isLoggedIn={
                                                                                    isLoggedIn
                                                                                }
                                                                                currencySymbol={
                                                                                    currencySymbol
                                                                                }
                                                                                includedProducts={
                                                                                    includedProducts
                                                                                }
                                                                                theme={
                                                                                    theme
                                                                                }
                                                                                onSelect={(
                                                                                    planId,
                                                                                ) => {
                                                                                    field.onChange(
                                                                                        planId,
                                                                                    );
                                                                                    handlePlanSelection(
                                                                                        planId,
                                                                                    );
                                                                                }}
                                                                            />
                                                                        );
                                                                    },
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
                                            disabled={
                                                isSubmitting ||
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
                                            theme={theme.theme}
                                        >
                                            {isSubmitting
                                                ? "Working..."
                                                : "Complete Purchase"}
                                        </Button>
                                    </form>
                                </FormProvider>
                            </>
                        )}
                    </div>
                    <div className="hidden md:block">
                        <DesktopOrderSummary
                            product={product}
                            selectedPlan={selectedPlan}
                            currencySymbol={currencySymbol}
                            theme={theme}
                        />
                    </div>
                </div>
            </div>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <Script
                src="https://app.lemonsqueezy.com/js/lemon.js"
                id="lemonsqueezy"
            />
        </div>
    );
}
