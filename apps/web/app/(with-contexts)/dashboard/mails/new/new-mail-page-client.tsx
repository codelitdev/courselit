"use client";

import {
    Address,
    EmailTemplate,
    SequenceType,
} from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

interface NewMailPageClientProps {
    systemTemplates: EmailTemplate[];
}

const NewMailPageClient = ({ systemTemplates }: NewMailPageClientProps) => {
    const address = useContext(AddressContext);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = () => {};

    const type = searchParams?.get("type") as SequenceType;

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

    const createSequence = async (template: EmailTemplate) => {
        const mutation = `
        mutation createSequence(
            $type: SequenceType!,
            $title: String!,
            $content: String!
        ) {
            sequence: createSequence(type: $type, title: $title, content: $content) {
                sequenceId
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    type: type.toUpperCase(),
                    title: template.title,
                    content: JSON.stringify(template.content),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(true),
                );
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
        } finally {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(false),
                );
        }
    };

    const onTemplateClick = (template: EmailTemplate) => {
        createSequence(template);
    };

    return (
        <div className="p-8">
            <h1 className="text-4xl font-semibold mb-8">Choose a template</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...systemTemplates, ...templates].map((template) => (
                    <Card
                        key={template.templateId}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => onTemplateClick(template)}
                    >
                        <CardHeader>
                            <CardTitle>{template.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48 bg-gray-200 flex items-center justify-center">
                                <p className="text-gray-500">Preview</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default NewMailPageClient;
