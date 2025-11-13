"use client";

import DashboardContent from "@components/admin/dashboard-content";
import PermissionsEditor from "@components/admin/users/permissions-editor";
import { AddressContext, ProfileContext } from "@components/contexts";
import DocumentationLink from "@components/public/documentation-link";
import { UserWithAdminFields } from "@courselit/common-models";
import { permissions } from "@courselit/common-models/dist/ui-constants";
import { ComboBox, useToast } from "@courselit/components-library";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    PAGE_HEADER_ALL_USER,
    PAGE_HEADER_EDIT_USER,
    SWITCH_ACCOUNT_ACTIVE,
    USER_BASIC_DETAILS_HEADER,
    USER_EMAIL_SUBHEADER,
    USER_NAME_SUBHEADER,
    USER_TAGS_SUBHEADER,
    PERM_SECTION_HEADER,
    USER_PERMISSION_AREA_SUBTEXT,
    DANGER_ZONE_HEADER,
    USER_DELETE_DIALOG_DESCRIPTION,
    USER_DELETE_DIALOG_TITLE,
    USER_DELETE_CONFIRMATION_LABEL,
    USER_DELETE_CONFIRMATION_PLACEHOLDER,
    USER_DELETE_CONFIRMATION_TOKEN,
    USER_DELETE_ACTION_LOADING,
    USER_DELETE_DIALOG_MIGRATION_HEADING,
    USER_DELETE_DIALOG_MIGRATION_ITEM_PRODUCTS,
    USER_DELETE_DIALOG_MIGRATION_ITEM_EMAIL,
    USER_DELETE_DIALOG_MIGRATION_ITEM_AUDIENCE,
    USER_DELETE_DIALOG_MIGRATION_ITEM_COMMUNITY,
    USER_DELETE_DIALOG_DELETION_HEADING,
    USER_DELETE_DIALOG_DELETION_ITEM_COMMUNICATION,
    USER_DELETE_DIALOG_DELETION_ITEM_COMMUNITY,
    USER_DELETE_DIALOG_DELETION_ITEM_COMMERCE,
    USER_DELETE_DIALOG_DELETION_ITEM_ACCOUNT,
    BTN_DELETE_USER,
    APP_MESSAGE_USER_DELETED,
    BUTTON_CANCEL_TEXT,
    POPUP_OK_ACTION,
    APP_MESSAGE_USER_UPDATED,
    USER_DETAILS_SAVE_BUTTON,
    USER_DETAILS_SAVE_BUTTON_LOADING,
    USER_NAME_PLACEHOLDER,
} from "@ui-config/strings";
import {
    FormEvent,
    KeyboardEvent,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    use,
} from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@components/ui/card";
import { Switch } from "@components/ui/switch";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
    Field,
    FieldContent,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@components/ui/field";
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
} from "@components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type AdminUser = UserWithAdminFields & { id: string };

const breadcrumbs = [
    { label: PAGE_HEADER_ALL_USER, href: "/dashboard/users" },
    { label: PAGE_HEADER_EDIT_USER, href: "#" },
];

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [userData, setUserData] = useState<AdminUser>();
    const [_, setEnrolledCourses] = useState([]);
    const [tags, setTags] = useState([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [basicDetails, setBasicDetails] = useState({
        name: "",
        active: false,
        tags: [] as string[],
    });
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const initialBasicDetailsRef = useRef({
        name: "",
        active: false,
        tags: [] as string[],
    });
    const address = useContext(AddressContext);
    const { id } = params;
    const { toast } = useToast();
    const { profile } = useContext(ProfileContext);
    const router = useRouter();
    const isEditingSelf = profile?.userId === id;

    const haveStringArraysChanged = (a: string[] = [], b: string[] = []) => {
        if (a.length !== b.length) {
            return true;
        }
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.some((value, index) => value !== sortedB[index]);
    };

    useEffect(() => {
        getUserDetails();
    }, [id]);

    useEffect(() => {
        if (userData) {
            setBasicDetails({
                name: userData.name || "",
                active: userData.active,
                tags: [...(userData.tags || [])],
            });
            initialBasicDetailsRef.current = {
                name: (userData.name || "").trim(),
                active: userData.active,
                tags: [...(userData.tags || [])],
            };
        }
    }, [userData]);

    const getTags = useCallback(async () => {
        const query = `
            query {
                tags
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [address.backend]);

    useEffect(() => {
        if (
            profile?.userId &&
            checkPermission(profile?.permissions!, [permissions.manageUsers])
        ) {
            getTags();
        }
    }, [getTags, profile?.userId]);

    const getUserDetails = async () => {
        const query = `
    query {
        user: getUser(userId: "${id}") { 
            id,
            email,
            name,
            active,
            permissions,
            userId,
            purchases {
               courseId 
            },
            tags
         }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    // TODO: test this method. A hard-coded userId was there in the query.
    // const getEnrolledCourses = async () => {
    //     const query = `
    //         query {
    //             enrolledCourses: getEnrolledCourses(userId: "${id}") {
    //                 id,
    //                 title
    //             }
    //         }
    //     `;
    //     const fetch = new FetchBuilder()
    //         .setUrl(`${address.backend}/api/graph`)
    //         .setPayload(query)
    //         .setIsGraphQLEndpoint(true)
    //         .build();
    //     try {
    //         const response = await fetch.exec();
    //         setEnrolledCourses(response.enrolledCourses);
    //     } catch (err) {
    //         toast({
    //             title: TOAST_TITLE_ERROR,
    //             description: err.message,
    //             variant: "destructive",
    //         });
    //     }
    // };

    const handleBasicDetailsSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        if (!userData) {
            return;
        }

        const trimmedName = basicDetails.name.trim();
        const formActive = basicDetails.active;
        const formTags = basicDetails.tags || [];
        const userTags = userData.tags || [];
        const hasTagsChanged = haveStringArraysChanged(formTags, userTags);

        if (
            trimmedName === (userData.name || "") &&
            formActive === userData.active &&
            !hasTagsChanged
        ) {
            return;
        }

        const variables: Record<string, unknown> = {
            id: userData.userId,
        };
        const variableDefinitions = ["$id: ID!"];
        const mutationFields = ["id: $id"];

        if (trimmedName !== (userData.name || "")) {
            variables.name = trimmedName;
            variableDefinitions.push("$name: String");
            mutationFields.push("name: $name");
        }

        if (formActive !== userData.active) {
            variables.active = formActive;
            variableDefinitions.push("$active: Boolean");
            mutationFields.push("active: $active");
        }

        if (hasTagsChanged) {
            variables.tags = formTags;
            variableDefinitions.push("$tags: [String!]");
            mutationFields.push("tags: $tags");
        }

        const mutation = `
    mutation UpdateUserBasicDetails(${variableDefinitions.join(", ")}) {
      user: updateUser(userData: {
          ${mutationFields.join("\n          ")}
      }) { 
        id,
        email,
        name,
        active,
        permissions,
        userId,
        tags
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    ...variables,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setIsSavingDetails(true);
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
                initialBasicDetailsRef.current = {
                    name: trimmedName,
                    active: formActive,
                    tags: [...formTags],
                };
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_USER_UPDATED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    };

    const handleDeleteUser = async () => {
        if (!userData) {
            return;
        }
        const mutation = `
            mutation DeleteUser($id: String!) {
                result: deleteUser(userId: $id)
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: userData.userId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setIsDeleting(true);
            const response = await fetch.exec();
            if (response.result) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_USER_DELETED,
                });
                router.push("/dashboard/users");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setDeleteConfirmation("");
        }
    };

    if (!userData) {
        return null;
    }

    const trimmedFormName = basicDetails.name.trim();
    const formActive = basicDetails.active;
    const formTags = basicDetails.tags || [];
    const userTags = userData.tags || [];
    // const hasTagsChanged = haveStringArraysChanged(formTags, userTags);
    const hasBasicDetailsChanged =
        trimmedFormName !== initialBasicDetailsRef.current.name ||
        formActive !== initialBasicDetailsRef.current.active ||
        haveStringArraysChanged(formTags, initialBasicDetailsRef.current.tags);
    const isSaveButtonDisabled = isSavingDetails || !hasBasicDetailsChanged;

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageUsers]}
        >
            <h1 className="text-4xl font-semibold mb-4">
                {userData.name ? userData.name : userData.email}
            </h1>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <Card className="md:w-1/2">
                        <CardHeader>
                            <CardTitle>{USER_BASIC_DETAILS_HEADER}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FieldSet>
                                <FieldLegend className="sr-only">
                                    {USER_BASIC_DETAILS_HEADER}
                                </FieldLegend>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="user-email">
                                            {USER_EMAIL_SUBHEADER}
                                        </FieldLabel>
                                        <Input
                                            id="user-email"
                                            value={userData.email}
                                            disabled
                                            readOnly
                                        />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                            <form
                                onSubmit={handleBasicDetailsSubmit}
                                className="space-y-4"
                            >
                                <FieldSet>
                                    <FieldGroup>
                                        <Field>
                                            <FieldLabel htmlFor="user-name">
                                                {USER_NAME_SUBHEADER}
                                            </FieldLabel>
                                            <Input
                                                id="user-name"
                                                value={basicDetails.name}
                                                onChange={(event) =>
                                                    setBasicDetails((prev) => ({
                                                        ...prev,
                                                        name: event.target
                                                            .value,
                                                    }))
                                                }
                                                placeholder={
                                                    USER_NAME_PLACEHOLDER
                                                }
                                                onKeyDown={handleNameKeyDown}
                                            />
                                        </Field>
                                        <Field
                                            orientation="horizontal"
                                            className="items-center justify-between"
                                        >
                                            <FieldLabel htmlFor="user-active">
                                                {SWITCH_ACCOUNT_ACTIVE}
                                            </FieldLabel>
                                            <Switch
                                                id="user-active"
                                                checked={formActive}
                                                onCheckedChange={(value) =>
                                                    !isEditingSelf &&
                                                    setBasicDetails((prev) => ({
                                                        ...prev,
                                                        active: value,
                                                    }))
                                                }
                                                disabled={isEditingSelf}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldContent>
                                                <FieldLabel>
                                                    {USER_TAGS_SUBHEADER}
                                                </FieldLabel>
                                            </FieldContent>
                                            <ComboBox
                                                options={tags}
                                                selectedOptions={
                                                    new Set(formTags)
                                                }
                                                onChange={(selected) =>
                                                    setBasicDetails((prev) => ({
                                                        ...prev,
                                                        tags: selected,
                                                    }))
                                                }
                                            />
                                        </Field>
                                    </FieldGroup>
                                </FieldSet>
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isSaveButtonDisabled}
                                    >
                                        {isSavingDetails
                                            ? USER_DETAILS_SAVE_BUTTON_LOADING
                                            : USER_DETAILS_SAVE_BUTTON}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="md:w-1/2">
                        <CardHeader>
                            <CardTitle>{PERM_SECTION_HEADER}</CardTitle>
                            <CardDescription>
                                <span>
                                    {USER_PERMISSION_AREA_SUBTEXT}{" "}
                                    <DocumentationLink path="/en/users/permissions/" />
                                    .
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PermissionsEditor
                                address={address}
                                user={userData}
                                disabled={profile?.userId === id}
                            />
                        </CardContent>
                    </Card>
                </div>
                {!isEditingSelf && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-destructive">
                                {DANGER_ZONE_HEADER}
                            </CardTitle>
                            <CardDescription>
                                {USER_DELETE_DIALOG_DESCRIPTION}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog
                                onOpenChange={(open) => {
                                    if (!open) {
                                        setDeleteConfirmation("");
                                        setIsDeleting(false);
                                    }
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {BTN_DELETE_USER}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {USER_DELETE_DIALOG_TITLE}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {USER_DELETE_DIALOG_DESCRIPTION}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="space-y-4 text-sm text-muted-foreground">
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {
                                                        USER_DELETE_DIALOG_MIGRATION_HEADING
                                                    }
                                                </p>
                                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_MIGRATION_ITEM_PRODUCTS
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_MIGRATION_ITEM_EMAIL
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_MIGRATION_ITEM_AUDIENCE
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_MIGRATION_ITEM_COMMUNITY
                                                        }
                                                    </li>
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {
                                                        USER_DELETE_DIALOG_DELETION_HEADING
                                                    }
                                                </p>
                                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_DELETION_ITEM_COMMUNICATION
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_DELETION_ITEM_COMMUNITY
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_DELETION_ITEM_COMMERCE
                                                        }
                                                    </li>
                                                    <li>
                                                        {
                                                            USER_DELETE_DIALOG_DELETION_ITEM_ACCOUNT
                                                        }
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="delete-confirmation">
                                                {USER_DELETE_CONFIRMATION_LABEL}
                                            </Label>
                                            <Input
                                                id="delete-confirmation"
                                                value={deleteConfirmation}
                                                onChange={(event) =>
                                                    setDeleteConfirmation(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder={
                                                    USER_DELETE_CONFIRMATION_PLACEHOLDER
                                                }
                                            />
                                        </div>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            {BUTTON_CANCEL_TEXT}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteUser}
                                            disabled={
                                                deleteConfirmation
                                                    .trim()
                                                    .toLowerCase() !==
                                                    USER_DELETE_CONFIRMATION_TOKEN ||
                                                isDeleting
                                            }
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {USER_DELETE_ACTION_LOADING}
                                                </>
                                            ) : (
                                                POPUP_OK_ACTION
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardContent>
    );
}
