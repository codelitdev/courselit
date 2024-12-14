"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    COMMUNITY_HEADER,
    COMMUNITY_SETTINGS,
    TOAST_DESCRIPTION_CHANGES_SAVED,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { ChangeEvent, useContext, useEffect, useState } from "react";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import { UIConstants } from "@courselit/common-models";
import LoadingScreen from "@components/admin/loading-screen";
import {
    Badge,
    Button,
    Form,
    FormField,
    Link,
    TextEditor,
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
import { X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Page({
    params,
}: {
    params: {
        id: string;
    };
}) {
    const { id } = params;
    const breadcrumbs = [
        {
            label: COMMUNITY_HEADER,
            href: `/dashboard4/community/${id}`,
        },
        { label: COMMUNITY_SETTINGS, href: "#" },
    ];
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);

    const [name, setName] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [defaultCommunity, setDefaultCommunity] = useState(false);
    const [autoAcceptMembers, setAutoAcceptMembers] = useState(false);
    const [banner, setBanner] = useState({ type: "doc", content: [] });
    const [refresh, setRefresh] = useState(0);
    const [categories, setCategories] = useState<string[]>([]);
    const [joiningReasonText, setJoiningReasonText] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [deletingCategory, setDeletingCategory] = useState<string | null>(
        null,
    );
    const [migrationCategory, setMigrationCategory] = useState<string>("");
    const [pageId, setPageId] = useState("");
    const { toast } = useToast();

    const handleDeleteConfirm = () => {
        toast({
            title: "Community Deleted",
            description:
                "Your community and all associated data have been permanently deleted.",
            variant: "destructive",
        });
    };

    useEffect(() => {
        loadCommunity();
    }, []);

    const loadCommunity = async () => {
        const query = `
            query GetCommunity($id: String!) {
                community: getCommunity(id: $id) {
                    name
                    enabled
                    default
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                    pageId
                }
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.community) {
                setCommunity(response.community);
            }
        } catch (error) {
            console.error("Error loading community:", error);
        }
    };

    const setCommunity = (community: any) => {
        setName(community.name);
        setEnabled(community.enabled);
        setDefaultCommunity(community.default);
        if (community.banner) {
            setBanner(community.banner);
        }
        setCategories(community.categories);
        setAutoAcceptMembers(community.autoAcceptMembers);
        setJoiningReasonText(community.joiningReasonText);
        setPageId(community.pageId);
        setRefresh(refresh + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = `
            mutation UpdateCommunity(
                $id: String!
                $name: String
                $default: Boolean
                $enabled: Boolean
                $banner: String 
                $autoAcceptMembers: Boolean
                $joiningReasonText: String
            ) {
                community: updateCommunity(
                    id: $id
                    name: $name
                    default: $default
                    enabled: $enabled
                    banner: $banner
                    autoAcceptMembers: $autoAcceptMembers
                    joiningReasonText: $joiningReasonText
                ) {
                    name
                    enabled
                    default
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                }
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                        name,
                        enabled,
                        default: defaultCommunity,
                        banner: JSON.stringify(banner),
                        autoAcceptMembers,
                        joiningReasonText,
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
                console.error("Error updating community:", response.error);
            }
        } catch (error) {
            console.error("Error updating community:", error);
        }
    };

    if (
        !checkPermission(profile.permissions!, [
            UIConstants.permissions.manageSite,
        ])
    ) {
        return <LoadingScreen />;
    }

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
                const fetchRequest = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
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
                console.error("Error adding category:", error);
            }
        }
    };

    const handleDeleteCategory = (category: Category) => {
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
                const fetchRequest = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
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
                console.error("Error deleting category:", error);
            }
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-semibold mb-8">
                        {COMMUNITY_SETTINGS}
                    </h1>
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
                        <h2 className="font-semibold">Banner</h2>
                        <TextEditor
                            initialContent={banner}
                            onChange={(state: any) => setBanner(state)}
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
                                Default Community
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Mark the community as the default
                            </p>
                        </div>
                        <Switch
                            id="default"
                            checked={defaultCommunity}
                            onCheckedChange={setDefaultCommunity}
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
                        placeholder="Text to show when users request to join"
                    />
                </div>
                <Button type="submit">Save Changes</Button>
            </Form>
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
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">
                        Community page
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Edit the landing page for your community
                    </p>
                    <Link
                        href={`/dashboard4/page/${pageId}?redirectTo=/dashboard4/community/${id}/settings`}
                    >
                        <Button variant="secondary">Edit Community Page</Button>
                    </Link>
                </div>
            </div>
            <Separator className="my-8" />
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive">
                    Danger Zone
                </h3>
                <AlertDialog>
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
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm}>
                                Delete
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
