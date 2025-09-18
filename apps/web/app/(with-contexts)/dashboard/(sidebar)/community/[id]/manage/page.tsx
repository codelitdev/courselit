"use client";

import DashboardContent from "@components/admin/dashboard-content";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import {
    COMMUNITY_HEADER,
    COMMUNITY_SETTINGS,
    DANGER_ZONE_HEADER,
    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
    TOAST_DESCRIPTION_CHANGES_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { ChangeEvent, useContext, useEffect, useState, use } from "react";
import {
    PaymentPlan,
    Constants,
    PaymentPlanType,
    Profile,
    Media,
} from "@courselit/common-models";
import {
    Badge,
    Form,
    FormField,
    Image,
    Link,
    MediaSelector,
    TextEditor,
    TextEditorEmptyDoc,
    useToast,
} from "@courselit/components-library";
import { Separator } from "@components/ui/separator";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Edit, FlagTriangleRight, Loader2, Users, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import PaymentPlanList from "@components/admin/payments/payment-plan-list";
import { useCommunity } from "@/hooks/use-community";
import { Button } from "@components/ui/button";
import { Input } from "@/components/ui/input";
import { redirect, useRouter } from "next/navigation";
import { useMembership } from "@/hooks/use-membership";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
const { PaymentPlanType: paymentPlanType, MembershipEntityType } = Constants;

export default function Page(props: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = use(props.params);
    const { id } = params;
    const breadcrumbs = [
        {
            label: COMMUNITY_HEADER,
            href: `/dashboard/community/${id}`,
        },
        { label: COMMUNITY_SETTINGS, href: "#" },
    ];
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);

    const [name, setName] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [autoAcceptMembers, setAutoAcceptMembers] = useState(false);
    const [banner, setBanner] = useState(TextEditorEmptyDoc);
    const [description, setDescription] = useState(TextEditorEmptyDoc);
    const [refresh, setRefresh] = useState(0);
    const [categories, setCategories] = useState<string[]>([]);
    const [joiningReasonText, setJoiningReasonText] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [deletingCategory, setDeletingCategory] = useState<string | null>(
        null,
    );
    const [migrationCategory, setMigrationCategory] = useState<string>("");
    const [pageId, setPageId] = useState("");
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
    const [featuredImage, setFeaturedImage] = useState<Media | null>(null);
    const { toast } = useToast();
    const { community, error, loaded: communityLoaded } = useCommunity(id);
    const { membership, loaded: membershipLoaded } = useMembership(id);
    const [defaultPaymentPlan, setDefaultPaymentPlan] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const fetch = useGraphQLFetch();

    useEffect(() => {
        if (communityLoaded && community) {
            setCommunity(community);
        }
    }, [community, communityLoaded]);

    useEffect(() => {
        if (
            communityLoaded &&
            membershipLoaded &&
            (community === null ||
                membership === null ||
                (membership &&
                    membership.role !== Constants.MembershipRole.MODERATE))
        ) {
            redirect(`/dashboard/community/${id}`);
        }
    }, [community, communityLoaded, membership, membershipLoaded]);

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        const query = `
            mutation DeleteCommunity($id: String!) {
                community: deleteCommunity(id: $id) {
                    communityId
                }
            }
        `;

        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    id,
                },
            })
            .build();

        try {
            const response = await fetchRequest.exec();
            if (response.community) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: "Community has been deleted successfully",
                });
                router.replace("/dashboard/communities");
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const setCommunity = (community: any) => {
        setName(community.name);
        if (community.description) {
            setDescription(community.description);
        }
        setEnabled(community.enabled);
        if (community.banner) {
            setBanner(community.banner);
        }
        setCategories(community.categories);
        setAutoAcceptMembers(community.autoAcceptMembers);
        setJoiningReasonText(community.joiningReasonText || "");
        setPageId(community.pageId);
        setPaymentPlans(community.paymentPlans);
        setDefaultPaymentPlan(community.defaultPaymentPlan);
        setFeaturedImage(community.featuredImage);
        setRefresh(refresh + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = `
            mutation UpdateCommunity(
                $id: String!
                $name: String
                $description: String
                $enabled: Boolean
                $autoAcceptMembers: Boolean
                $joiningReasonText: String
            ) {
                community: updateCommunity(
                    id: $id
                    name: $name
                    description: $description
                    enabled: $enabled
                    autoAcceptMembers: $autoAcceptMembers
                    joiningReasonText: $joiningReasonText
                ) {
                    communityId
                    name
                    description
                    enabled
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                    pageId
                    paymentPlans {
                        planId
                        name
                        type
                        entityId
                        entityType
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                    }
                    defaultPaymentPlan
                    featuredImage {
                        mediaId
                        originalFileName
                        mimeType
                        size
                        access
                        file
                        thumbnail
                        caption
                    }
                }
            }
        `;
        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    id,
                    name,
                    description: JSON.stringify(description),
                    enabled,
                    autoAcceptMembers,
                    joiningReasonText,
                },
            })
            .build();
        try {
            const response = await fetchRequest.exec();
            if (response.community) {
                setCommunity(response.community);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_DESCRIPTION_CHANGES_SAVED,
                });
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const updateFeaturedImage = async (media?: Media) => {
        const query = `
            mutation UpdateCommunity(
                $id: String!
                $featuredImage: MediaInput 
            ) {
                community: updateCommunity(
                    id: $id
                    featuredImage: $featuredImage
                ) {
                    communityId
                    name
                    description
                    enabled
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                    pageId
                    paymentPlans {
                        planId
                        name
                        type
                        entityId
                        entityType
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                    }
                    defaultPaymentPlan
                    featuredImage {
                        mediaId
                        originalFileName
                        mimeType
                        size
                        access
                        file
                        thumbnail
                        caption
                    }
                }
            }
        `;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        id,
                        featuredImage: media || null,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.community) {
                setCommunity(response.community);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_DESCRIPTION_CHANGES_SAVED,
                });
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategory.trim()) {
            const query = `
                mutation AddCategory($id: String!, $category: String!) {
                    addCategory(id: $id, category: $category) {
                        categories
                    }
                }
            `;
            try {
                const fetchRequest = fetch
                    .setPayload({
                        query,
                        variables: {
                            id,
                            category: newCategory.trim(),
                        },
                    })
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetchRequest.exec();
                if (response.addCategory) {
                    setCategories(response.addCategory.categories);
                    setNewCategory("");
                    toast({
                        title: "Category Added",
                        description: `Category "${newCategory}" has been added successfully.`,
                    });
                }
            } catch (error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            }
        }
    };

    const handleDeleteCategory = (category: string) => {
        setDeletingCategory(category);
        setMigrationCategory("");
    };

    const confirmDeleteCategory = async () => {
        if (deletingCategory) {
            const query = `
                mutation DeleteCategory($id: String!, $category: String!, $migrateToCategory: String) {
                    deleteCategory(id: $id, category: $category, migrateToCategory: $migrateToCategory) {
                        categories
                    }
                }
            `;
            try {
                const fetchRequest = fetch
                    .setPayload({
                        query,
                        variables: {
                            id,
                            category: deletingCategory,
                            migrateToCategory: migrationCategory || null,
                        },
                    })
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetchRequest.exec();
                if (response.deleteCategory) {
                    setCategories(response.deleteCategory.categories);
                    toast({
                        title: "Category Deleted",
                        description: `The category "${deletingCategory}" has been removed and posts migrated to "${migrationCategory}".`,
                    });
                    setDeletingCategory(null);
                    setMigrationCategory("");
                }
            } catch (error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            }
        }
    };

    // const onPlanSubmitted = async (plan: PaymentPlan) => {
    //     const query = `
    //         mutation CreatePlan(
    //             $name: String!,
    //             $type: PaymentPlanType!,
    //             $entityId: String!,
    //             $entityType: MembershipEntityType!
    //             $oneTimeAmount: Int,
    //             $emiAmount: Int,
    //             $emiTotalInstallments: Int,
    //             $subscriptionMonthlyAmount: Int,
    //             $subscriptionYearlyAmount: Int,
    //         ) {
    //             plan: createPlan(
    //                 name: $name,
    //                 type: $type,
    //                 entityId: $entityId,
    //                 entityType: $entityType,
    //                 oneTimeAmount: $oneTimeAmount,
    //                 emiAmount: $emiAmount,
    //                 emiTotalInstallments: $emiTotalInstallments,
    //                 subscriptionMonthlyAmount: $subscriptionMonthlyAmount,
    //                 subscriptionYearlyAmount: $subscriptionYearlyAmount,
    //             ) {
    //                 planId
    //                 name
    //                 type
    //                 oneTimeAmount
    //                 emiAmount
    //                 emiTotalInstallments
    //                 subscriptionMonthlyAmount
    //                 subscriptionYearlyAmount
    //             }
    //         }
    //     `;
    //     try {
    //         const fetchRequest = fetch
    //             .setPayload({
    //                 query,
    //                 variables: {
    //                     name: plan.name,
    //                     type: plan.type,
    //                     entityId: id,
    //                     entityType:
    //                         MembershipEntityType.COMMUNITY.toUpperCase(),
    //                     oneTimeAmount: plan.oneTimeAmount,
    //                     emiAmount: plan.emiAmount,
    //                     emiTotalInstallments: plan.emiTotalInstallments,
    //                     subscriptionMonthlyAmount:
    //                         plan.subscriptionMonthlyAmount,
    //                     subscriptionYearlyAmount: plan.subscriptionYearlyAmount,
    //                 },
    //             })
    //             .setIsGraphQLEndpoint(true)
    //             .build();
    //         const response = await fetchRequest.exec();
    //         if (response.plan) {
    //             setPaymentPlans([...paymentPlans, response.plan]);
    //         }
    //     } catch (error: any) {
    //         toast({
    //             title: TOAST_TITLE_ERROR,
    //             description: error.message,
    //             variant: "destructive",
    //         });
    //     }
    // };

    const onPlanArchived = async (planId: string) => {
        const query = `
            mutation ArchivePlan($planId: String!) {
                plan: archivePlan(planId: $planId) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                }   
            }
        `;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        planId,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.plan) {
                setPaymentPlans(
                    paymentPlans.filter((p) => p.planId !== planId),
                );
            }
        } catch (error: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const onDefaultPlanChanged = async (planId: string) => {
        const query = `
            mutation ChangeDefaultPlan($planId: String!, $entityId: String!, $entityType: MembershipEntityType!) {
                plan: changeDefaultPlan(planId: $planId, entityId: $entityId, entityType: $entityType) {
                    planId
                }   
            }
        `;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        planId,
                        entityId: id,
                        entityType:
                            MembershipEntityType.COMMUNITY.toUpperCase(),
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.plan) {
                setDefaultPaymentPlan(response.plan.planId);
            }
        } catch (error: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
                        <h1 className="text-4xl font-semibold ">
                            {COMMUNITY_SETTINGS}
                        </h1>
                        <div className="flex gap-2">
                            <Link
                                href={`/dashboard/page/${pageId}?redirectTo=/dashboard/community/${id}/manage`}
                            >
                                <Button variant="outline" className="">
                                    <Edit className="w-4 h-4" /> Edit page
                                </Button>
                            </Link>
                            <Link
                                href={`/dashboard/community/${id}/manage/memberships`}
                            >
                                <Button variant="outline" className="">
                                    <Users className="w-4 h-4" /> Memberships
                                </Button>
                            </Link>
                            <Link
                                href={`/dashboard/community/${id}/manage/reports`}
                            >
                                <Button variant="outline" className="">
                                    <FlagTriangleRight className="w-4 h-4" />{" "}
                                    Reported content
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <p className="text-muted-foreground">
                        Manage your community settings.
                    </p>
                </div>
                <div className="space-y-6">
                    <FormField
                        value={name}
                        name="name"
                        label={"Name"}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setName(e.target.value)
                        }
                        placeholder="Community name"
                    />
                    <div>
                        <h2 className="font-semibold">Description</h2>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                            url={address.backend}
                            refresh={refresh}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="enabled" className="font-semibold">
                                Community Enabled
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Allow users to join your community
                            </p>
                        </div>
                        <Switch
                            id="enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="default" className="font-semibold">
                                Auto accept members
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically accept new members
                            </p>
                        </div>
                        <Switch
                            id="autoAcceptMembers"
                            checked={autoAcceptMembers}
                            onCheckedChange={setAutoAcceptMembers}
                        />
                    </div>
                    <FormField
                        value={joiningReasonText}
                        name="joiningReasonText"
                        label="Joining reason text"
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setJoiningReasonText(e.target.value)
                        }
                        placeholder="Text to show when users request to join a free community"
                    />
                </div>
                <Button type="submit">Save Changes</Button>
            </Form>
            <Separator className="my-8" />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">
                        Featured image
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        The hero image for your community
                    </p>
                    {featuredImage && (
                        <div className="w-32 rounded overflow-hidden border">
                            <Image
                                src={
                                    featuredImage?.thumbnail ||
                                    "/courselit-backdrop-square.webp"
                                }
                                alt={name}
                            />
                        </div>
                    )}
                    <MediaSelector
                        title=""
                        profile={profile as Profile}
                        address={address}
                        mediaId={featuredImage?.mediaId}
                        src={featuredImage?.thumbnail || ""}
                        srcTitle={featuredImage?.originalFileName || ""}
                        onSelection={(media?: Media) => {
                            if (media) {
                                updateFeaturedImage(media);
                            }
                        }}
                        onRemove={() => {
                            updateFeaturedImage();
                        }}
                        access="public"
                        strings={{
                            buttonCaption: MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
                            removeButtonCaption:
                                MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
                        }}
                        type="community"
                        hidePreview={true}
                    />
                </div>
            </div>
            <Separator className="my-8" />
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">
                        Categories
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Add and manage community categories
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <Badge
                            key={category}
                            variant="secondary"
                            className="flex items-center gap-1"
                        >
                            {category}
                            <button
                                type="button"
                                onClick={() => handleDeleteCategory(category)}
                                className="ml-1 hover:bg-muted rounded-full"
                            >
                                <X className="h-3 w-3" />
                                <span className="sr-only">
                                    Remove {category} category
                                </span>
                            </button>
                        </Badge>
                    ))}
                </div>
                <Form onSubmit={handleAddCategory} className="flex gap-2">
                    <FormField
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter category name"
                        className="flex-1"
                    />
                    <Button type="submit" variant="secondary">
                        Add Category
                    </Button>
                </Form>
            </div>
            <Separator className="my-8" />
            <div className="space-y-4 flex flex-col md:flex-row md:items-start md:justify-between w-full">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Pricing</Label>
                    <p className="text-sm text-muted-foreground">
                        Manage your community pricing plans
                    </p>
                </div>
                <PaymentPlanList
                    paymentPlans={paymentPlans.map((plan) => ({
                        ...plan,
                        type: plan.type.toLowerCase() as PaymentPlanType,
                    }))}
                    onPlanArchived={onPlanArchived}
                    onDefaultPlanChanged={onDefaultPlanChanged}
                    defaultPaymentPlanId={defaultPaymentPlan}
                    entityId={id}
                    entityType={MembershipEntityType.COMMUNITY}
                />
            </div>
            <Separator className="my-8" />
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive">
                    {DANGER_ZONE_HEADER}
                </h3>
                <AlertDialog
                    onOpenChange={(open) =>
                        !open &&
                        (setDeleteConfirmation(""), setIsDeleting(false))
                    }
                >
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Community</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is irreversible. All community data
                                will be permanently deleted.
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
                                onClick={handleDeleteConfirm}
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
            {/* <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField
                    label={COMMUNITY_FIELD_NAME}
                    name="name"
                    value={name || ""}
                    onChange={setName}
                    required
                />
                <div>
                    <Button type="submit">{BUTTON_SAVE}</Button>
                </div>
            </Form> */}
            <Dialog
                open={!!deletingCategory}
                onOpenChange={() => setDeletingCategory(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            Please select a category to migrate the posts from
                            &quot;
                            {deletingCategory}&quot; before deleting.
                        </DialogDescription>
                    </DialogHeader>
                    <Select
                        value={migrationCategory}
                        onValueChange={setMigrationCategory}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories
                                .filter((c) => c !== deletingCategory)
                                .map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingCategory(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="!bg-red-500 text-white hover:!bg-red-600"
                            variant="destructive"
                            onClick={confirmDeleteCategory}
                        >
                            {`Delete and migrate existing content to ${migrationCategory || "'None'"}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardContent>
    );
}
