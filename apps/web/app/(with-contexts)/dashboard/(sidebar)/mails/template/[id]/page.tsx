"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import DashboardContent from "@components/admin/dashboard-content";
import EmailViewer from "@components/admin/mails/email-viewer";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
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
import { Button } from "@components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import { EmailTemplate } from "@courselit/common-models";
import { useRouter } from "next/navigation";
import { truncate } from "@courselit/utils";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
    BTN_DELETE_TEMPLATE,
    BUTTON_SAVING,
    BUTTON_SAVE,
    DANGER_ZONE_HEADER,
    DELETE_TEMPLATE_DIALOG_DESCRIPTION,
    DELETE_TEMPLATE_DIALOG_HEADER,
    PAGE_HEADER_MANAGE,
    TEMPLATES,
    TEMPLATE_MANAGE_DESCRIPTION,
    TEMPLATE_NAME_LABEL,
    TEMPLATE_NAME_PLACEHOLDER,
    TEMPLATE_PREVIEW_DESCRIPTION,
    TEMPLATE_PREVIEW_HEADER,
    TOAST_TEMPLATE_DELETED,
    TOAST_TEMPLATE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";

const formSchema = z.object({
    title: z.string().trim().min(1, "Template name is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Page(props: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = use(props.params);
    const router = useRouter();
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const initialValuesRef = useRef<FormData>({ title: "" });
    const currentValuesRef = useRef<FormData>({ title: "" });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            title: "",
        },
        mode: "onChange",
    });

    const watchedTitle = form.watch("title");

    useEffect(() => {
        currentValuesRef.current = { title: watchedTitle || "" };
    }, [watchedTitle]);

    const canSubmit = useMemo(() => {
        const currentTitle = (watchedTitle || "").trim();

        return (
            currentTitle.length > 0 &&
            currentTitle !== initialValuesRef.current.title &&
            form.formState.isValid &&
            !isLoading &&
            !isSaving
        );
    }, [form.formState.isValid, isLoading, isSaving, watchedTitle]);

    const loadTemplate = useCallback(async () => {
        setIsLoading(true);

        const query = `
            query GetEmailTemplate($templateId: String!) {
                template: getEmailTemplate(templateId: $templateId) {
                    templateId
                    title
                    content {
                        content {
                            blockType
                            settings
                        }
                        style
                        meta
                    }
                }
            }
        `;

        try {
            const response = await fetch
                .setPayload({
                    query,
                    variables: {
                        templateId: id,
                    },
                })
                .build()
                .exec();

            if (response.template) {
                setTemplate(response.template);
                initialValuesRef.current = {
                    title: response.template.title.trim(),
                };
                currentValuesRef.current = {
                    title: response.template.title,
                };
                form.reset({
                    title: response.template.title,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [fetch, form, id, toast]);

    useEffect(() => {
        loadTemplate();
    }, [loadTemplate]);

    const onSubmit = async () => {
        const title = currentValuesRef.current.title.trim();

        if (!title || title === initialValuesRef.current.title) {
            return;
        }

        const mutation = `
            mutation UpdateEmailTemplate($templateId: String!, $title: String!) {
                template: updateEmailTemplate(
                    templateId: $templateId
                    title: $title
                ) {
                    templateId
                    title
                    content {
                        content {
                            blockType
                            settings
                        }
                        style
                        meta
                    }
                }
            }
        `;

        try {
            setIsSaving(true);

            const response = await fetch
                .setPayload({
                    query: mutation,
                    variables: {
                        templateId: id,
                        title,
                    },
                })
                .build()
                .exec();

            if (response.template) {
                setTemplate(response.template);
                initialValuesRef.current = {
                    title: response.template.title.trim(),
                };
                currentValuesRef.current = { title: response.template.title };
                form.reset({ title: response.template.title });
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_TEMPLATE_SAVED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const deleteTemplate = async () => {
        const mutation = `
            mutation DeleteEmailTemplate($templateId: String!) {
                deleted: deleteEmailTemplate(templateId: $templateId)
            }
        `;

        try {
            setIsDeleting(true);

            const response = await fetch
                .setPayload({
                    query: mutation,
                    variables: {
                        templateId: id,
                    },
                })
                .build()
                .exec();

            if (response.deleted) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_TEMPLATE_DELETED,
                });
                router.replace("/dashboard/mails?tab=Templates");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const breadcrumbs = [
        { label: TEMPLATES, href: "/dashboard/mails?tab=Templates" },
        {
            label: truncate(template?.title || PAGE_HEADER_MANAGE, 20),
            href: "#",
        },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-semibold">
                        {PAGE_HEADER_MANAGE}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {TEMPLATE_MANAGE_DESCRIPTION}
                    </p>
                </div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-semibold">
                                            {TEMPLATE_NAME_LABEL}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={
                                                    TEMPLATE_NAME_PLACEHOLDER
                                                }
                                                disabled={isLoading}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={!canSubmit || isLoading}
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isSaving ? BUTTON_SAVING : BUTTON_SAVE}
                        </Button>
                    </form>
                </Form>
                <Separator />
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">
                            {TEMPLATE_PREVIEW_HEADER}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {TEMPLATE_PREVIEW_DESCRIPTION}
                        </p>
                    </div>
                </div>
                {!isLoading && (
                    <EmailViewer
                        content={template?.content || null}
                        emailEditorLink={`/dashboard/mail/template/${id}`}
                    />
                )}
                <Separator />
                <div className="space-y-4">
                    <h2 className="text-destructive font-semibold">
                        {DANGER_ZONE_HEADER}
                    </h2>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isDeleting || isLoading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {BTN_DELETE_TEMPLATE}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {DELETE_TEMPLATE_DIALOG_HEADER}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {DELETE_TEMPLATE_DIALOG_DESCRIPTION}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={deleteTemplate}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {BTN_DELETE_TEMPLATE}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </DashboardContent>
    );
}
