"use client";

import { FormEvent, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    APP_MESSAGE_COURSE_DELETED,
    APP_MESSAGE_COURSE_SAVED,
    BTN_DELETE_COURSE,
    COURSE_SETTINGS_CARD_HEADER,
    CUSTOMIZE_CERTIFICATE_TEMPLATE,
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
import { redirect, useParams, useRouter } from "next/navigation";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { truncate } from "@ui-lib/utils";
import {
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
    UIConstants,
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
    // UPDATE_COST_TYPE: `
    //     mutation UpdateCostType($courseId: String!, $costType: CostType!) {
    //         updateCourse(courseData: { id: $courseId, costType: $costType }) {
    //             courseId
    //         }
    //     }
    // `,
    // UPDATE_COST: `
    //     mutation UpdateCost($courseId: String!, $cost: Float!) {
    //         updateCourse(courseData: { id: $courseId, cost: $cost }) {
    //             courseId
    //         }
    //     }
    // `,
    UPDATE_LEAD_MAGNET: `
        mutation UpdateLeadMagnet($courseId: String!, $leadMagnet: Boolean!) {
            updateCourse(courseData: { id: $courseId, leadMagnet: $leadMagnet }) {
                courseId
            }
        }
    `,
    UPDATE_CERTIFICATE: `
        mutation UpdateCertificate($courseId: String!, $certificate: Boolean!) {
            updateCourse(courseData: { id: $courseId, certificate: $certificate }) {
                courseId
            }
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
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;
    const [errors, setErrors] = useState({});
    const address = useContext(AddressContext);
    const { product, loaded: productLoaded } = useProduct(productId);
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
        certificate: boolean;
    }>({
        name: "",
        description: TextEditorEmptyDoc,
        isPublished: false,
        isPrivate: false,
        featuredImage: {},
        costType: PRICING_FREE,
        cost: 0,
        leadMagnet: false,
        certificate: false,
    });
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        { label: COURSE_SETTINGS_CARD_HEADER, href: "#" },
    ];
    const [refresh, setRefresh] = useState(0);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
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
                certificate: product?.certificate || false,
            });
            setRefresh(refresh + 1);
            setPaymentPlans(product?.paymentPlans || []);
            setDefaultPaymentPlan(product?.defaultPaymentPlan || "");
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
            certificate: {
                mutation: MUTATIONS.UPDATE_CERTIFICATE,
                variables: { certificate: value },
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
                        courseId: product.courseId,
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
            setIsDeleting(true);
            const response = await fetch.exec();

            if (response.result) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_DELETED,
                });
                redirect("/dashboard/products");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: APP_MESSAGE_COURSE_DELETED,
            });
            router.push("/dashboard/products");
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
                    {product?.type?.toLowerCase() === UIConstants.COURSE_TYPE_COURSE && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">
                                    Certificate
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Enable certificate for this course. {product?.certificate && (
                                        <Link href={`/dashboard/product/${productId}/manage/certificate`}>
                                            <span className="underline text-black">
                                                {CUSTOMIZE_CERTIFICATE_TEMPLATE}
                                            </span>
                                        </Link>
                                    )}
                                </p>
                            </div>
                            <Switch
                                checked={formData.certificate}
                                onCheckedChange={() =>
                                    handleSwitchChange("certificate")
                                }
                            />
                        </div>
                    )}
                </div>

                <Separator />

                <div className="space-y-4">
                    <h2 className="text-destructive font-semibold">
                        {DANGER_ZONE_HEADER}
                    </h2>
                    <AlertDialog
                        onOpenChange={(open) =>
                            !open &&
                            (setDeleteConfirmation(""), setIsDeleting(false))
                        }
                    >
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={loading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {BTN_DELETE_COURSE}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action is irreversible. All product
                                    data will be permanently deleted.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label
                                    htmlFor="delete-confirmation"
                                    className="text-sm font-medium"
                                >
                                    Type &quot;delete&quot; to confirm
                                </Label>
                                <Input
                                    id="delete-confirmation"
                                    type="text"
                                    placeholder="Type 'delete' to confirm"
                                    value={deleteConfirmation}
                                    onChange={(e) =>
                                        setDeleteConfirmation(e.target.value)
                                    }
                                    className="mt-2"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={deleteProduct}
                                    disabled={
                                        deleteConfirmation !== "delete" ||
                                        isDeleting
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete"
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </DashboardContent>
    );
}
