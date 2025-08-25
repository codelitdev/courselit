"use client";

import { useContext, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RadioGroup } from "@/components/ui/radio-group";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Check, X } from "lucide-react";
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
import Script from "next/script";
import { Button, Header3, Text1 } from "@courselit/page-primitives";
import { PaymentPlanCard } from "./payment-plan-card";
import { MobileOrderSummary, DesktopOrderSummary } from "./order-summary";
const { PaymentPlanType: paymentPlanType } = Constants;

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

        if (profile?.userId) {
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
                            email: profile?.email || "",
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
                <div className="w-full grid md:grid-cols-[1fr,400px] gap-8">
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
                    <DesktopOrderSummary
                        product={product}
                        selectedPlan={selectedPlan}
                        currencySymbol={currencySymbol}
                        theme={theme}
                    />
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
