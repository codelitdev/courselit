"use client";

import { EmailTemplate } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    MAIL_TEMPLATE_CHOOSER_CUSTOM_DESCRIPTION,
    TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_DESCRIPTION,
    TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_TITLE,
    MAIL_TEMPLATE_CHOOSER_CUSTOM_SECTION,
    MAIL_TEMPLATE_CHOOSER_SYSTEM_DESCRIPTION,
    MAIL_TEMPLATE_CHOOSER_SYSTEM_SECTION,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";
import AdminEmptyState from "@components/admin/empty-state";
import TemplateEmailPreview from "./template-email-preview";

const sortSystemTemplates = (templates: EmailTemplate[]) =>
    [...templates].sort((a, b) => {
        if (a.title === "Blank") {
            return 1;
        }

        if (b.title === "Blank") {
            return -1;
        }

        return a.title.localeCompare(b.title);
    });

const TemplateGrid = ({
    templates,
    onTemplateClick,
}: {
    templates: EmailTemplate[];
    onTemplateClick: (template: EmailTemplate) => void;
}) => (
    <div className="grid grid-cols-1 justify-items-start gap-6 md:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
            <Card
                key={template.templateId}
                className="w-full max-w-[320px] cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => onTemplateClick(template)}
            >
                <CardHeader className="px-5 pb-3 pt-5">
                    <CardTitle>{template.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <TemplateEmailPreview
                        content={template.content || null}
                        className="pointer-events-none"
                    />
                </CardContent>
            </Card>
        ))}
    </div>
);

const NewMailPageClient = () => {
    const address = useContext(AddressContext);
    const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const type = searchParams?.get("type");
    const mode = searchParams?.get("mode");
    const sequenceId = searchParams?.get("sequenceId");
    const brandedSystemTemplates = sortSystemTemplates(systemTemplates);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        const query = `
            query GetMailTemplates {
                systemTemplates: getSystemEmailTemplates {
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
                templates: getEmailTemplates {
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
            }`;

        const fetcher = fetch
            .setPayload({
                query,
            })
            .build();

        try {
            const response = await fetcher.exec();
            if (response.systemTemplates) {
                setSystemTemplates(response.systemTemplates);
            }
            if (response.templates) {
                setTemplates(response.templates);
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const createSequence = async (template: EmailTemplate) => {
        const mutation = `
            mutation createSequence(
                $type: SequenceType!,
                $templateId: String!
            ) {
                sequence: createSequence(type: $type, templateId: $templateId) {
                    sequenceId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    type: type?.toUpperCase(),
                    templateId: template.templateId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.sequence && response.sequence.sequenceId) {
                router.push(
                    `/dashboard/mails/${type}/${response.sequence.sequenceId}`,
                );
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const addTemplateToSequence = async (template: EmailTemplate) => {
        if (!sequenceId) {
            return;
        }

        const mutation = `
            mutation AddMailToSequence(
                $sequenceId: String!,
                $templateId: String!
            ) {
                sequence: addMailToSequence(
                    sequenceId: $sequenceId,
                    templateId: $templateId
                ) {
                    sequenceId
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    sequenceId,
                    templateId: template.templateId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.sequence?.sequenceId) {
                router.push(
                    `/dashboard/mails/sequence/${response.sequence.sequenceId}`,
                );
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const createTemplateFromSelection = async (template: EmailTemplate) => {
        const mutation = `
            mutation CreateEmailTemplate($templateId: String!) {
                template: createEmailTemplate(templateId: $templateId) {
                    templateId
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    templateId: template.templateId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.template?.templateId) {
                router.push(
                    `/dashboard/mails/template/${response.template.templateId}`,
                );
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const onTemplateClick = (template: EmailTemplate) => {
        if (mode === "add-to-sequence" && sequenceId) {
            addTemplateToSequence(template);
            return;
        }

        if (type === "template") {
            createTemplateFromSelection(template);
            return;
        }

        createSequence(template);
    };

    const skeletonCards = Array.from({ length: 6 });

    return (
        <div className="space-y-10">
            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">
                        {MAIL_TEMPLATE_CHOOSER_SYSTEM_SECTION}
                    </h2>
                    <p className="text-muted-foreground">
                        {MAIL_TEMPLATE_CHOOSER_SYSTEM_DESCRIPTION}
                    </p>
                </div>
                <TemplateGrid
                    templates={brandedSystemTemplates}
                    onTemplateClick={onTemplateClick}
                />
            </section>
            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">
                        {MAIL_TEMPLATE_CHOOSER_CUSTOM_SECTION}
                    </h2>
                    <p className="text-muted-foreground">
                        {MAIL_TEMPLATE_CHOOSER_CUSTOM_DESCRIPTION}
                    </p>
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 justify-items-start gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {skeletonCards.map((_, idx) => (
                            <Card
                                key={`skeleton-${idx}`}
                                className="w-full max-w-[320px] overflow-hidden"
                            >
                                <CardHeader className="px-5 pb-3 pt-5">
                                    <CardTitle>
                                        <Skeleton className="h-7 w-40" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5 pt-0">
                                    <Skeleton className="h-[420px] w-full rounded-lg" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : templates.length ? (
                    <TemplateGrid
                        templates={templates}
                        onTemplateClick={onTemplateClick}
                    />
                ) : (
                    <AdminEmptyState
                        title={TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_TITLE}
                        description={
                            TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_DESCRIPTION
                        }
                        className="mt-2"
                    />
                )}
            </section>
        </div>
    );
};

export default NewMailPageClient;
