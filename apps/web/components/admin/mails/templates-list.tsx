"use client";

import {
    Address,
    EmailTemplate,
} from "@courselit/common-models";
import { Link, useToast } from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    MAIL_TABLE_HEADER_TITLE,
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

interface TemplatesListProps {
    address: Address;
    loading: boolean;
    dispatch?: AppDispatch;
}

const TemplatesList = ({
    address,
    dispatch,
    loading,
}: TemplatesListProps) => {
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
            dispatch && dispatch(networkAction(true));
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
            dispatch && dispatch(networkAction(false));
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
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
        </div>
    );
};

export default TemplatesList;
