"use client";

import { useContext, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2, X, Package, Info, DollarSign } from "lucide-react";
import {
    PaymentPlanType,
    Constants,
    MembershipEntityType,
    Course,
} from "@courselit/common-models";
import { usePaymentPlanOperations } from "@/hooks/use-payment-plan-operations";
import { useRouter } from "next/navigation";
import { getSymbolFromCurrency, useToast } from "@courselit/components-library";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import {
    BUTTON_SAVE,
    BUTTON_SAVING,
    FORM_NEW_PRODUCT_TITLE,
    FORM_NEW_PRODUCT_TITLE_PLC,
    FORM_NEW_PRODUCT_SELECT,
    PAYMENT_PLAN_FREE_LABEL,
    PAYMENT_PLAN_ONETIME_LABEL,
    PAYMENT_PLAN_SUBSCRIPTION_LABEL,
    PAYMENT_PLAN_EMI_LABEL,
    SEO_FORM_DESC_LABEL,
    TOAST_TITLE_SUCCESS,
    TOAST_DESCRIPTION_CHANGES_SAVED,
} from "@/ui-config/strings";
import { SiteInfoContext } from "@components/contexts";
import { useProducts } from "@/hooks/use-products";
import { capitalize } from "@courselit/utils";
import { Badge } from "@components/ui/badge";

const { PaymentPlanType: paymentPlanType } = Constants;

export const formSchema = z
    .object({
        planId: z.string().optional(),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
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
        includedProducts: z.array(z.string()).default([]),
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

export type PaymentPlanFormData = z.infer<typeof formSchema>;

interface PaymentPlanFormProps {
    initialData?: Partial<PaymentPlanFormData>;
    entityId: string;
    entityType: MembershipEntityType;
}

export function PaymentPlanForm({
    initialData,
    entityId,
    entityType,
}: PaymentPlanFormProps) {
    const [planType, setPlanType] = useState<PaymentPlanType>(
        initialData?.type || paymentPlanType.FREE,
    );
    const [subscriptionType, setSubscriptionType] = useState<
        "monthly" | "yearly"
    >(initialData?.subscriptionType || "monthly");
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);

    const paymentPlanOperations = usePaymentPlanOperations({
        id: entityId,
        entityType,
    });
    const router = useRouter();
    const { toast } = useToast();
    const siteinfo = useContext(SiteInfoContext);
    const fetch = useGraphQLFetch();
    const currencySymbol = getSymbolFromCurrency(
        siteinfo.currencyISOCode || "USD",
    );
    const currencyISOCode = siteinfo.currencyISOCode?.toUpperCase() || "USD";

    const form = useForm<PaymentPlanFormData>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            name: "",
            description: "",
            type: paymentPlanType.FREE,
            oneTimeAmount: 0,
            emiAmount: 0,
            emiTotalInstallments: 0,
            subscriptionMonthlyAmount: 0,
            subscriptionYearlyAmount: 0,
            subscriptionType: "monthly",
            includedProducts: [],
            ...initialData,
        },
    });

    const onPlanUpdated = async (plan: any) => {
        const query = `
            mutation UpdatePlan(
                $planId: String!
                $name: String
                $type: PaymentPlanType
                $oneTimeAmount: Int
                $emiAmount: Int
                $emiTotalInstallments: Int
                $subscriptionMonthlyAmount: Int
                $subscriptionYearlyAmount: Int
                $description: String
                $includedProducts: [String]
            ) {
                plan: updatePlan(
                    planId: $planId
                    name: $name
                    type: $type
                    oneTimeAmount: $oneTimeAmount
                    emiAmount: $emiAmount
                    emiTotalInstallments: $emiTotalInstallments
                    subscriptionMonthlyAmount: $subscriptionMonthlyAmount
                    subscriptionYearlyAmount: $subscriptionYearlyAmount
                    description: $description
                    includedProducts: $includedProducts
                ) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                    includedProducts
                }
            }
        `;

        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    planId: plan.planId,
                    ...plan,
                },
            })
            .build();
        try {
            const response = await fetchRequest.exec();
            return response.plan;
        } catch (error) {
            throw error;
        }
    };

    const onPlanSubmitted = async (plan: any) => {
        const query = `
            mutation CreatePlan(
                $name: String!
                $type: PaymentPlanType!
                $entityId: String!
                $entityType: MembershipEntityType!
                $oneTimeAmount: Int
                $emiAmount: Int
                $emiTotalInstallments: Int
                $subscriptionMonthlyAmount: Int
                $subscriptionYearlyAmount: Int
                $description: String
                $includedProducts: [String]
            ) {
                plan: createPlan(
                    name: $name
                    type: $type
                    entityId: $entityId
                    entityType: $entityType
                    oneTimeAmount: $oneTimeAmount
                    emiAmount: $emiAmount
                    emiTotalInstallments: $emiTotalInstallments
                    subscriptionMonthlyAmount: $subscriptionMonthlyAmount
                    subscriptionYearlyAmount: $subscriptionYearlyAmount
                    description: $description
                    includedProducts: $includedProducts
                ) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                    includedProducts
                }
            }
        `;

        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    ...plan,
                    entityId: entityId,
                    entityType: entityType.toUpperCase(),
                },
            })
            .build();
        try {
            const response = await fetchRequest.exec();
            return response.plan;
        } catch (error) {
            throw error;
        }
    };

    async function handleSubmit(values: PaymentPlanFormData) {
        setIsFormSubmitting(true);
        try {
            if (initialData?.planId) {
                await onPlanUpdated(values);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_DESCRIPTION_CHANGES_SAVED,
                });
            } else {
                const { planId } = await onPlanSubmitted(values);
                const type =
                    entityType.toLowerCase() ===
                    Constants.MembershipEntityType.COMMUNITY
                        ? "community"
                        : "product";
                router.push(
                    `/dashboard/paymentplan/${type}/${entityId}/edit/${planId}`,
                );
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to create payment plan",
                variant: "destructive",
            });
        } finally {
            setIsFormSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-8"
            >
                <BasicInformationSection
                    form={form}
                    planType={planType}
                    setPlanType={setPlanType}
                />

                <Separator className="my-8" />
                <PricingSection
                    form={form}
                    planType={planType}
                    setPlanType={setPlanType}
                    subscriptionType={subscriptionType}
                    setSubscriptionType={setSubscriptionType}
                    currencySymbol={currencySymbol}
                    currencyISOCode={currencyISOCode}
                />

                <Separator className="my-8" />
                {entityType === Constants.MembershipEntityType.COMMUNITY && (
                    <IncludedProductsSection form={form} />
                )}

                <Button type="submit" disabled={isFormSubmitting}>
                    {isFormSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {isFormSubmitting ? BUTTON_SAVING : BUTTON_SAVE}
                </Button>
            </form>
        </Form>
    );
}

// Basic Information Section Component
function BasicInformationSection({
    form,
    planType,
    setPlanType,
}: {
    form: any;
    planType: PaymentPlanType;
    setPlanType: (type: PaymentPlanType) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">
                        Basic Information
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                    Configure the basic details of your payment plan
                </p>
            </div>
            <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }: any) => (
                        <FormItem>
                            <FormLabel>{FORM_NEW_PRODUCT_TITLE}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={FORM_NEW_PRODUCT_TITLE_PLC}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }: any) => (
                        <FormItem>
                            <FormLabel>{SEO_FORM_DESC_LABEL}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter plan description"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}

// Pricing Section Component
function PricingSection({
    form,
    planType,
    setPlanType,
    subscriptionType,
    setSubscriptionType,
    currencySymbol,
    currencyISOCode,
}: {
    form: any;
    planType: PaymentPlanType;
    setPlanType: (type: PaymentPlanType) => void;
    subscriptionType: "monthly" | "yearly";
    setSubscriptionType: (type: "monthly" | "yearly") => void;
    currencySymbol?: string;
    currencyISOCode?: string;
}) {
    const siteinfo = useContext(SiteInfoContext);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Pricing</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                    Set the pricing structure for your payment plan
                </p>
            </div>
            <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }: any) => (
                        <FormItem>
                            <FormLabel>{FORM_NEW_PRODUCT_SELECT}</FormLabel>
                            <Select
                                onValueChange={(value: PaymentPlanType) => {
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
                                    <SelectItem value={paymentPlanType.FREE}>
                                        {PAYMENT_PLAN_FREE_LABEL}
                                    </SelectItem>
                                    <SelectItem
                                        value={paymentPlanType.ONE_TIME}
                                        disabled={!siteinfo.paymentMethod}
                                    >
                                        {PAYMENT_PLAN_ONETIME_LABEL}
                                    </SelectItem>
                                    <SelectItem
                                        value={paymentPlanType.SUBSCRIPTION}
                                        disabled={!siteinfo.paymentMethod}
                                    >
                                        {PAYMENT_PLAN_SUBSCRIPTION_LABEL}
                                    </SelectItem>
                                    <SelectItem
                                        value={paymentPlanType.EMI}
                                        disabled={!siteinfo.paymentMethod}
                                    >
                                        {PAYMENT_PLAN_EMI_LABEL}
                                    </SelectItem>
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
                        render={({ field }: any) => (
                            <FormItem>
                                <FormLabel>One-time Amount</FormLabel>
                                <FormControl>
                                    <div className="flex items-center border rounded-md">
                                        <span className="text-muted-foreground text-sm pl-2">
                                            {currencySymbol}
                                        </span>
                                        <Input
                                            type="number"
                                            className="border-0 focus-visible:ring-0 focus:outline-hidden"
                                            placeholder="Enter amount"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value),
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
                    <div className="space-y-4">
                        <div>
                            <FormLabel>
                                Monthly Payments (All fields required)
                            </FormLabel>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name="emiTotalInstallments"
                                        render={({ field }: any) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="flex items-center border rounded-md">
                                                        <Input
                                                            type="number"
                                                            className="border-0 focus-visible:ring-0 focus:outline-hidden"
                                                            placeholder="Enter number"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
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
                                <span className="text-muted-foreground">×</span>
                                <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name="emiAmount"
                                        render={({ field }: any) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="flex items-center border rounded-md">
                                                        <span className="text-muted-foreground text-sm pl-2">
                                                            {currencySymbol}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            className="border-0 focus-visible:ring-0 focus:outline-hidden"
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
                                </div>
                            </div>
                            <div className="flex items-center mt-2">
                                <span className="text-muted-foreground text-sm mr-1">
                                    Total:
                                </span>
                                <span className="font-medium">
                                    {currencySymbol}
                                    {(form.watch("emiAmount") || 0) *
                                        (form.watch("emiTotalInstallments") ||
                                            0)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {planType === paymentPlanType.SUBSCRIPTION && (
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="subscriptionType"
                            render={({ field }: any) => (
                                <FormItem>
                                    <FormLabel>Subscription Type</FormLabel>
                                    <Select
                                        onValueChange={(
                                            value: "monthly" | "yearly",
                                        ) => {
                                            field.onChange(value);
                                            setSubscriptionType(value);

                                            if (value === "monthly") {
                                                form.setValue(
                                                    "subscriptionYearlyAmount",
                                                    0,
                                                );
                                            } else {
                                                form.setValue(
                                                    "subscriptionMonthlyAmount",
                                                    0,
                                                );
                                            }
                                        }}
                                        value={field.value}
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

                        {subscriptionType === "monthly" && (
                            <FormField
                                control={form.control}
                                name="subscriptionMonthlyAmount"
                                render={({ field }: any) => (
                                    <FormItem>
                                        <FormLabel>Monthly Amount</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center border rounded-md">
                                                <span className="text-muted-foreground text-sm pl-2">
                                                    {currencySymbol}
                                                </span>
                                                <Input
                                                    type="number"
                                                    className="border-0 focus-visible:ring-0 focus:outline-hidden"
                                                    placeholder="Enter monthly amount"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            parseFloat(
                                                                e.target.value,
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

                        {subscriptionType === "yearly" && (
                            <FormField
                                control={form.control}
                                name="subscriptionYearlyAmount"
                                render={({ field }: any) => (
                                    <FormItem>
                                        <FormLabel>Yearly Amount</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center border rounded-md">
                                                <span className="text-muted-foreground text-sm pl-2">
                                                    {currencySymbol}
                                                </span>
                                                <Input
                                                    type="number"
                                                    className="border-0 focus-visible:ring-0 focus:outline-hidden"
                                                    placeholder="Enter yearly amount"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            parseFloat(
                                                                e.target.value,
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
                    </div>
                )}
            </div>
        </div>
    );
}

// Included Products Section Component
function IncludedProductsSection({ form }: { form: any }) {
    const filters = useMemo(
        () => [
            Constants.CourseType.COURSE.toUpperCase(),
            Constants.CourseType.DOWNLOAD.toUpperCase(),
        ],
        [],
    );
    const { products, loading: productsLoading } = useProducts(
        1,
        1000,
        filters,
    );

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">
                        Included Products
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                    Specify which products are included with this payment plan
                </p>
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="product-select">Add Product</Label>
                    <Select
                        value=""
                        onValueChange={(value) => {
                            const currentProducts =
                                form.getValues("includedProducts") || [];
                            if (!currentProducts.includes(value)) {
                                form.setValue("includedProducts", [
                                    ...currentProducts,
                                    value,
                                ]);
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a product to add" />
                        </SelectTrigger>
                        <SelectContent>
                            {productsLoading ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">
                                    Loading products...
                                </div>
                            ) : (
                                products
                                    .filter(
                                        (
                                            product: Course & {
                                                published: boolean;
                                            },
                                        ) => product.published,
                                    )
                                    .filter(
                                        (product) =>
                                            !form
                                                .watch("includedProducts")
                                                ?.includes(product.courseId),
                                    )
                                    .map((product) => (
                                        <SelectItem
                                            key={product.courseId}
                                            value={product.courseId}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span>{product.title}</span>
                                                <span className="text-sm text-muted-foreground ml-2">
                                                    {capitalize(product.type)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                            )}
                            {!productsLoading &&
                                products.filter(
                                    (product) =>
                                        !form
                                            .watch("includedProducts")
                                            ?.includes(product.courseId),
                                ).length === 0 && (
                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                        {products.length === 0
                                            ? "No products available"
                                            : "All products already added"}
                                    </div>
                                )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Display Selected Products */}
                {form.watch("includedProducts")?.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">
                                Selected Products
                            </Label>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                {form.watch("includedProducts")?.length}{" "}
                                selected
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form
                                .watch("includedProducts")
                                ?.map((productId: string) => {
                                    const product:
                                        | (Course & { published: boolean })
                                        | undefined = products.find(
                                        (p) => p.courseId === productId,
                                    ) as
                                        | (Course & { published: boolean })
                                        | undefined;
                                    return product ? (
                                        <div
                                            key={productId}
                                            className="group relative inline-flex items-center gap-2 px-3 py-2 bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg transition-all duration-200 hover:shadow-md hover:border-primary/30"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary opacity-60"></div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium text-foreground line-clamp-1">
                                                        {product.title}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            {capitalize(
                                                                product.type,
                                                            )}
                                                        </span>
                                                        {!product.published && (
                                                            <Badge variant="destructive">
                                                                Unpublished
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const currentProducts =
                                                        form.getValues(
                                                            "includedProducts",
                                                        ) || [];
                                                    const updatedProducts =
                                                        currentProducts.filter(
                                                            (id: string) =>
                                                                id !==
                                                                productId,
                                                        );
                                                    form.setValue(
                                                        "includedProducts",
                                                        updatedProducts,
                                                    );
                                                }}
                                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : null;
                                })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// PaymentPlanForm Skeleton Component
export const PaymentPlanFormSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        {/* Basic Information Section */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Pricing Section */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-80" />
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Included Products Section */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-72" />
                </div>
            </div>
        </div>

        {/* Submit Button */}
        <Skeleton className="h-10 w-24" />
    </div>
);
