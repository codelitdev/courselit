"use client";

import { FormEvent, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    APP_MESSAGE_COURSE_DELETED,
    APP_MESSAGE_COURSE_SAVED,
    BTN_DELETE_COURSE,
    BUTTON_CANCEL_TEXT,
    COURSE_SETTINGS_CARD_HEADER,
    DANGER_ZONE_HEADER,
    MANAGE_COURSES_PAGE_HEADING,
    PRICING_EMAIL,
    PRICING_EMAIL_LABEL,
    PRICING_EMAIL_SUBTITLE,
    PRICING_FREE,
    PRICING_FREE_LABEL,
    PRICING_FREE_SUBTITLE,
    PRICING_PAID,
    PRICING_PAID_LABEL,
    PRICING_PAID_NO_PAYMENT_METHOD,
    PRICING_PAID_SUBTITLE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { redirect, useParams } from "next/navigation";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { truncate } from "@ui-lib/utils";
import {
    getSymbolFromCurrency,
    MediaSelector,
    TextEditor,
    TextEditorEmptyDoc,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    Media,
    PaymentPlanType,
    ProductPriceType,
    Profile,
    Constants,
} from "@courselit/common-models";
import { COURSE_TYPE_DOWNLOAD, MIMETYPE_IMAGE } from "@ui-config/constants";
import useProduct from "@/hooks/use-product";
import { usePaymentPlanOperations } from "@/hooks/use-payment-plan-operations";
import PaymentPlanList from "@components/admin/payments/payment-plan-list";
import {
    TooltipProvider,
    TooltipTrigger,
    TooltipContent,
    Tooltip,
} from "@components/ui/tooltip";
const { PaymentPlanType: paymentPlanType, MembershipEntityType } = Constants;

const MUTATIONS = {
    UPDATE_BASIC_DETAILS: `
        mutation UpdateBasicDetails($courseId: String!, $title: String!, $description: String!) {
            updateCourse(courseData: { id: $courseId, title: $title, description: $description }) {
               courseId 
            }
        }
    `,
    UPDATE_PUBLISHED: `
        mutation UpdatePublished($courseId: String!, $published: Boolean!) {
            updateCourse(courseData: { id: $courseId, published: $published }) {
                courseId
            }
        }
    `,
    UPDATE_PRIVACY: `
        mutation UpdatePrivacy($courseId: String!, $privacy: CoursePrivacyType!) {
            updateCourse(courseData: { id: $courseId, privacy: $privacy }) {
                courseId
            }
        }
    `,
    UPDATE_FEATURED_IMAGE: `
        mutation UpdateFeaturedImage($courseId: String!, $media: MediaInput) {
            updateCourse(courseData: {
                id: $courseId
                featuredImage: $media
            }) {
                courseId
            }
        }
    `,
    UPDATE_COST_TYPE: `
        mutation UpdateCostType($courseId: String!, $costType: CostType!) {
            updateCourse(courseData: { id: $courseId, costType: $costType }) {
                courseId
            }
        }
    `,
    UPDATE_COST: `
        mutation UpdateCost($courseId: String!, $cost: Float!) {
            updateCourse(courseData: { id: $courseId, cost: $cost }) {
                courseId
            }
        }
    `,
    UPDATE_LEAD_MAGNET: `
        mutation UpdateLeadMagnet($courseId: String!, $leadMagnet: Boolean!) {
            updateCourse(courseData: { id: $courseId, leadMagnet: $leadMagnet }) {
                courseId
            }
    `,
};

const updateCourse = async (query: string, variables: any, address: string) => {
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload({ query, variables })
        .setIsGraphQLEndpoint(true)
        .build();

    return await fetch.exec();
};

const withErrorHandling = async (
    action: () => Promise<any>,
    setLoading: (loading: boolean) => void,
    toast: any,
) => {
    try {
        setLoading(true);
        const response = await action();
        if (response?.updateCourse) {
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: APP_MESSAGE_COURSE_SAVED,
            });
        }
        return response;
    } catch (err: any) {
        toast({
            title: TOAST_TITLE_ERROR,
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
};

export default function SettingsPage() {
    const { toast } = useToast();
    const params = useParams();
    const productId = params.id as string;
    const [errors, setErrors] = useState({});
    const address = useContext(AddressContext);
    const { product, loaded: productLoaded } = useProduct(productId, address);
    const profile = useContext(ProfileContext);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        description: any;
        isPublished: boolean;
        isPrivate: boolean;
        featuredImage: any;
        costType: ProductPriceType;
        cost: number;
        leadMagnet: boolean;
    }>({
        name: "",
        description: TextEditorEmptyDoc,
        isPublished: false,
        isPrivate: false,
        featuredImage: {},
        costType: PRICING_FREE,
        cost: 0,
        leadMagnet: false,
    });
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product-new/${productId}`,
        },
        { label: COURSE_SETTINGS_CARD_HEADER, href: "#" },
    ];
    const [refresh, setRefresh] = useState(0);
    const siteinfo = useContext(SiteInfoContext);
    const {
        paymentPlans,
        setPaymentPlans,
        defaultPaymentPlan,
        setDefaultPaymentPlan,
        onPlanSubmitted,
        onPlanArchived,
        onDefaultPlanChanged,
    } = usePaymentPlanOperations({
        id: productId,
        entityType: MembershipEntityType.COURSE,
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product?.title || "",
                description: product?.description
                    ? JSON.parse(product.description)
                    : TextEditorEmptyDoc,
                isPublished: product?.published || false,
                isPrivate:
                    product?.privacy!.toUpperCase() === "UNLISTED" || false,
                featuredImage:
                    product?.featuredImage || (null as string | null),
                costType:
                    product?.costType ||
                    (PRICING_FREE.toUpperCase() as ProductPriceType),
                cost: product?.cost || 0,
                leadMagnet: product?.leadMagnet || false,
            });
            setRefresh(refresh + 1);
            setPaymentPlans(product?.paymentPlans || []);
        }
    }, [product]);

    if (productLoaded && !product) {
        redirect("/dashboard/products");
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdateField = async (field: string, value: any) => {
        if (!product?.courseId) return;

        const fieldConfig = {
            isPublished: {
                mutation: MUTATIONS.UPDATE_PUBLISHED,
                variables: { published: value },
            },
            isPrivate: {
                mutation: MUTATIONS.UPDATE_PRIVACY,
                variables: { privacy: value ? "UNLISTED" : "PUBLIC" },
            },
            leadMagnet: {
                mutation: MUTATIONS.UPDATE_LEAD_MAGNET,
                variables: { leadMagnet: value },
            },
        }[field];

        if (!fieldConfig) return;

        await withErrorHandling(
            () =>
                updateCourse(
                    fieldConfig.mutation,
                    { courseId: product.courseId, ...fieldConfig.variables },
                    address.backend,
                ),
            setLoading,
            toast,
        );
    };

    const handleSwitchChange = async (name: string) => {
        const newValue = !formData[name];
        setFormData((prev) => ({ ...prev, [name]: newValue }));
        await handleUpdateField(name, newValue);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm() || !product?.courseId) return;

        await withErrorHandling(
            () =>
                updateCourse(
                    MUTATIONS.UPDATE_BASIC_DETAILS,
                    {
                        id: product.courseId,
                        title: formData.name,
                        description: JSON.stringify(formData.description),
                    },
                    address.backend,
                ),
            setLoading,
            toast,
        );
    };

    const saveFeaturedImage = async (media?: Media) => {
        if (!product?.courseId) return;

        await withErrorHandling(
            () =>
                updateCourse(
                    MUTATIONS.UPDATE_FEATURED_IMAGE,
                    {
                        courseId: product.courseId,
                        media: media || null,
                    },
                    address.backend,
                ),
            setLoading,
            toast,
        );
    };

    // const handleCostTypeChange = async (val: string) => {
    //     setFormData((prev) => ({
    //         ...prev,
    //         costType: val as ProductPriceType,
    //     }));

    //     if (!product?.courseId) return;

    //     await withErrorHandling(
    //         () =>
    //             updateCourse(
    //                 MUTATIONS.UPDATE_COST_TYPE,
    //                 {
    //                     id: product.courseId,
    //                     costType: val,
    //                 },
    //                 address.backend,
    //             ),
    //         setLoading,
    //         toast,
    //     );
    // };

    // const debouncedUpdateCost = useCallback(
    //     debounce((value: number, productId: string) => {
    //         withErrorHandling(
    //             () =>
    //                 updateCourse(
    //                     MUTATIONS.UPDATE_COST,
    //                     {
    //                         id: productId,
    //                         cost: value,
    //                     },
    //                     address.backend,
    //                 ),
    //             setLoading,
    //             toast,
    //         );
    //     }, 1000), // 1 second delay
    //     [address.backend, toast], // Dependencies
    // );

    // const handleCostChange = (value: number) => {
    //     setFormData((prev) => ({
    //         ...prev,
    //         cost: value,
    //     }));

    //     if (!product?.courseId) return;
    //     debouncedUpdateCost(value, product.courseId);
    // };

    const options: {
        label: string;
        value: string;
        sublabel: string;
        disabled?: boolean;
    }[] = [
        {
            label: PRICING_FREE_LABEL,
            value: PRICING_FREE.toUpperCase(),
            sublabel: PRICING_FREE_SUBTITLE,
        },
        {
            label: PRICING_PAID_LABEL,
            value: PRICING_PAID.toUpperCase(),
            sublabel: siteinfo.paymentMethod
                ? PRICING_PAID_SUBTITLE
                : PRICING_PAID_NO_PAYMENT_METHOD,
            disabled: !siteinfo.paymentMethod,
        },
    ];
    if (product?.type?.toLowerCase() === COURSE_TYPE_DOWNLOAD) {
        options.splice(1, 0, {
            label: PRICING_EMAIL_LABEL,
            value: PRICING_EMAIL.toUpperCase(),
            sublabel: PRICING_EMAIL_SUBTITLE,
        });
    }

    const deleteProduct = async () => {
        if (!product) return;

        const query = `
            mutation {
                result: deleteCourse(id: "${product?.courseId}")
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();

            if (response.result) {
                redirect("/dashboard/products");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: APP_MESSAGE_COURSE_DELETED,
            });
        }
    };

    if (!product) {
        return null;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-semibold">Manage</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your product settings
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <Label
                            htmlFor="name"
                            className="text-base font-semibold"
                        >
                            Name
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Label
                            htmlFor="description"
                            className="text-base font-semibold"
                        >
                            Description
                        </Label>

                        <TextEditor
                            initialContent={formData.description}
                            onChange={(state: any) => {
                                handleInputChange({
                                    target: {
                                        name: "description",
                                        value: state,
                                    },
                                });
                            }}
                            url={address.backend}
                            refresh={refresh}
                        />
                    </div>

                    <Button type="submit" disabled={loading}>
                        Save Changes
                    </Button>
                </form>

                <Separator />

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Featured image</h2>
                    <p className="text-sm text-muted-foreground">
                        The hero image for your course
                    </p>
                    {/* <MediaUpload
              type="image"
              value={formData.featuredImage}
              recommendedSize="1280x720px"
            /> */}
                    <MediaSelector
                        title=""
                        src={
                            (formData.featuredImage &&
                                formData.featuredImage.thumbnail) ||
                            ""
                        }
                        srcTitle={
                            (formData.featuredImage &&
                                formData.featuredImage.originalFileName) ||
                            ""
                        }
                        onSelection={(media?: Media) => {
                            media &&
                                setFormData((prev) => ({
                                    ...prev,
                                    featuredImage: media,
                                }));
                            saveFeaturedImage(media);
                        }}
                        mimeTypesToShow={[...MIMETYPE_IMAGE]}
                        access="public"
                        strings={{}}
                        profile={profile as Profile}
                        address={address}
                        mediaId={
                            (formData.featuredImage &&
                                formData.featuredImage.mediaId) ||
                            ""
                        }
                        onRemove={() => {
                            setFormData((prev) => ({
                                ...prev,
                                featuredImage: {},
                            }));
                            saveFeaturedImage();
                        }}
                        type="course"
                    />
                </div>

                <Separator />

                <div className="space-y-4 flex flex-col md:flex-row md:items-start md:justify-between w-full">
                    <div className="space-y-2">
                        <Label className="text-lg font-semibold">Pricing</Label>
                        <p className="text-sm text-muted-foreground">
                            Manage your product&apos;s pricing plans
                        </p>
                    </div>
                    <PaymentPlanList
                        paymentPlans={paymentPlans.map((plan) => ({
                            ...plan,
                            type: plan.type.toLowerCase() as PaymentPlanType,
                        }))}
                        onPlanSubmit={async (values) => {
                            try {
                                await onPlanSubmitted(values);
                            } catch (err: any) {
                                toast({
                                    title: TOAST_TITLE_ERROR,
                                    description: err.message,
                                });
                            }
                        }}
                        onPlanArchived={async (id) => {
                            try {
                                await onPlanArchived(id);
                            } catch (err: any) {
                                toast({
                                    title: TOAST_TITLE_ERROR,
                                    description: err.message,
                                });
                            }
                        }}
                        allowedPlanTypes={[
                            paymentPlanType.SUBSCRIPTION,
                            paymentPlanType.FREE,
                            paymentPlanType.ONE_TIME,
                            paymentPlanType.EMI,
                        ]}
                        currencySymbol={getSymbolFromCurrency(
                            siteinfo.currencyISOCode || "USD",
                        )}
                        currencyISOCode={
                            siteinfo.currencyISOCode?.toUpperCase() || "USD"
                        }
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
                        paymentMethod={siteinfo.paymentMethod}
                    />
                </div>

                {product?.type?.toLowerCase() === COURSE_TYPE_DOWNLOAD && (
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            {/* <Label className="text-base font-semibold">
                            Lead Magnet
                        </Label> */}
                            <Label
                                className={`${paymentPlans.length !== 1 || !paymentPlans.some((plan) => plan.type === paymentPlanType.FREE) ? "text-muted-foreground" : ""} text-base font-semibold`}
                            >
                                Lead Magnet
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Send the product to user for free in exchange of
                                their email address
                            </p>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <Switch
                                            checked={formData.leadMagnet}
                                            disabled={
                                                paymentPlans.length !== 1 ||
                                                !paymentPlans.some(
                                                    (plan) =>
                                                        plan.type ===
                                                        paymentPlanType.FREE,
                                                )
                                            }
                                            onCheckedChange={() =>
                                                handleSwitchChange("leadMagnet")
                                            }
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        Product must have exactly one free
                                        payment plan to enable lead magnet
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}

                {/* <div className="space-y-6">
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">
                            Pricing Model
                        </Label>
                        <Select
                            name="costType"
                            value={formData.costType}
                            title=""
                            onChange={handleCostTypeChange}
                            options={options}
                        />
                    </div>
                    {PRICING_PAID.toUpperCase() ===
                        formData.costType.toUpperCase() && (
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">
                                    Price
                                </Label>
                                <div className="relative w-full sm:w-[200px]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {getSymbolFromCurrency(
                                            siteinfo.currencyISOCode || "USD",
                                        )}
                                    </span>
                                    <Input
                                        type="number"
                                        name="cost"
                                        placeholder="0.00"
                                        className="pl-8"
                                        value={formData.cost}
                                        onChange={(e) =>
                                            handleCostChange(+e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        )}
                </div> */}

                <Separator />

                <div className="space-y-6" id="publish">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">
                                Published
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Make this course available to students
                            </p>
                        </div>
                        <Switch
                            checked={formData.isPublished}
                            onCheckedChange={() =>
                                handleSwitchChange("isPublished")
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label
                                className={`${!formData.isPublished ? "text-muted-foreground" : ""} text-base font-semibold`}
                            >
                                Visibility
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Only accessible via direct link
                            </p>
                        </div>
                        <Switch
                            checked={formData.isPrivate}
                            onCheckedChange={() =>
                                handleSwitchChange("isPrivate")
                            }
                            disabled={!formData.isPublished}
                        />
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <h2 className="text-destructive font-semibold">
                        {DANGER_ZONE_HEADER}
                    </h2>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={loading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {BTN_DELETE_COURSE}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Are you sure you want to delete this
                                    product?
                                </DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the product and remove
                                    all associated data from our servers.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">
                                        {BUTTON_CANCEL_TEXT}
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    onClick={deleteProduct}
                                    disabled={loading}
                                >
                                    {BTN_DELETE_COURSE}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </DashboardContent>
    );
}
