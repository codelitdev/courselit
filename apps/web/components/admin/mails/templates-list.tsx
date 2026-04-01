"use client";

import { Address, EmailTemplate } from "@courselit/common-models";
import { Link, useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    MAIL_TABLE_HEADER_TITLE,
    TEMPLATES_EMPTY_STATE_CTA,
    TEMPLATES_EMPTY_STATE_DESCRIPTION,
    TEMPLATES_EMPTY_STATE_TITLE,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import AdminEmptyState from "@components/admin/empty-state";

interface TemplatesListProps {
    address: Address;
}

const TemplatesList = ({ address }: TemplatesListProps) => {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        const query = `
            query GetEmailTemplates {
                templates: getEmailTemplates {
                    templateId
                    title
                }
            }`;

        const fetcher = fetch
            .setPayload({
                query,
            })
            .build();

        try {
            const response = await fetcher.exec();
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

    return (
        <div className="space-y-4">
            {!isLoading && templates.length === 0 ? (
                <AdminEmptyState
                    title={TEMPLATES_EMPTY_STATE_TITLE}
                    description={TEMPLATES_EMPTY_STATE_DESCRIPTION}
                    actionLabel={TEMPLATES_EMPTY_STATE_CTA}
                    actionHref="/dashboard/mails/new?type=template&source=templates"
                    className="mt-6 min-h-[360px] flex items-center justify-center"
                />
            ) : (
                <Table aria-label="Templates" className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead>{MAIL_TABLE_HEADER_TITLE}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 10 }).map((_, idx) => (
                                  <TableRow key={"skeleton-" + idx}>
                                      <TableCell className="py-4">
                                          <Skeleton className="h-5 w-40" />
                                      </TableCell>
                                  </TableRow>
                              ))
                            : templates.map((template) => (
                                  <TableRow key={template.templateId}>
                                      <TableCell className="py-4">
                                          <Link
                                              href={`/dashboard/mails/template/${template.templateId}`}
                                              className="flex"
                                          >
                                              {template.title}
                                          </Link>
                                      </TableCell>
                                  </TableRow>
                              ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default TemplatesList;
