"use client";

import { defaultEmail, EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
    useContext,
} from "react";
import type { Email as EmailContent } from "@courselit/email-editor";
import { useToast } from "@courselit/components-library";
import { debounce } from "@courselit/utils";
import { EmailEditorLayout } from "@components/admin/mails/editor-layout";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import useProduct from "@/hooks/use-product";
import { AddressContext } from "@components/contexts";
import { Group } from "@courselit/common-models";

const defaultEmailContent = {
    ...defaultEmail,
    content: [
        {
            blockType: "text",
            settings: {
                content: "Hi {{ subscriber.name }},",
            },
        },
        {
            blockType: "text",
            settings: {
                content:
                    "A new section is now available in [{{product.title}}]({{product.url}})",
            },
        },
        {
            blockType: "text",
            settings: {
                content: "{{address}}\n\n[Unsubscribe]({{unsubscribe_link}})",
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#64748b",
            },
        },
    ],
} as EmailContent;

export default function EmailEditorPage({
    params,
}: {
    params: {
        productId: string;
        sectionId: string;
    };
}) {
    const { productId, sectionId } = params;
    const [email, setEmail] = useState<EmailContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const address = useContext(AddressContext);
    const { product, loaded: productLoaded } = useProduct(productId, address);
    const [section, setSection] = useState<Group | null>(null);

    // Refs to track initial values and prevent saving during load
    const initialValues = useRef({
        content: null as EmailContent | null,
    });
    const isInitialLoad = useRef(true);

    const fetch = useGraphQLFetch();

    useEffect(() => {
        if (sectionId && product && product.groups) {
            const group = product.groups.find(
                (group) => group.id === sectionId,
            );
            if (group) {
                setSection(group);
                initialValues.current = {
                    content: group.drip?.email?.content || defaultEmailContent,
                };
                setEmail(group.drip?.email?.content || defaultEmailContent);
                isInitialLoad.current = false;
            }
        }
    }, [product]);

    // const updateGroup = async () => {
    //     const query = `
    //     mutation updateGroup($id: ID!, $courseId: String!, $name: String, $drip: DripInput) {
    //         course: updateGroup(
    //             id: $id,
    //             courseId: $courseId,
    //             name: $name,
    //             drip: $drip
    //         ) {
    //             courseId,
    //             groups {
    //                 id,
    //                 name,
    //                 rank,
    //                 collapsed,
    //                 drip {
    //                     type,
    //                     status,
    //                     delayInMillis,
    //                     dateInUTC,
    //                     email {
    //                         content {
    //                             content {
    //                                 blockType,
    //                                 settings
    //                             },
    //                             style,
    //                             meta
    //                         },
    //                         subject
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     `;
    //     const fetch = new FetchBuilder()
    //         .setUrl(`${address.backend}/api/graph`)
    //         .setPayload({
    //             query,
    //             variables: {
    //                 id: sectionId,
    //                 courseId: product?.courseId,
    //                 name: sectionName,
    //                 drip: dripType
    //                     ? {
    //                           status: enableDrip,
    //                           type: dripType.toUpperCase().split("-")[0],
    //                           delayInMillis: delay,
    //                           dateInUTC: date,
    //                           email: notifyUsers
    //                               ? {
    //                                     subject: emailSubject,
    //                                     content: JSON.stringify(emailContent),
    //                                 }
    //                               : undefined,
    //                       }
    //                     : undefined,
    //             },
    //         })
    //         .setIsGraphQLEndpoint(true)
    //         .build();
    //     console.log(query)
    //     try {
    //         setLoading(true);
    //         const response = await fetch.exec();
    //         if (response.course) {
    //             // router.replace(
    //             //     `/dashboard/product/${productId}/content`,
    //             // );
    //             toast({
    //                 title: TOAST_TITLE_SUCCESS,
    //                 description: TOAST_DESCRIPTION_CHANGES_SAVED,
    //             });
    //         }
    //     } catch (err: any) {
    //         // toast({
    //         //     title: TOAST_TITLE_ERROR,
    //         //     description: err.message,
    //         //     variant: "destructive",
    //         // });
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // Debounced save function
    const saveEmail = useCallback(
        async (emailContent: EmailContent) => {
            // Check if content has actually changed
            const hasChanged =
                JSON.stringify(emailContent) !==
                JSON.stringify(initialValues.current.content);

            if (!hasChanged) {
                return;
            }

            setIsSaving(true);

            const mutation = ` 
            mutation updateGroup($id: ID!, $courseId: String!, $name: String, $drip: DripInput) {
                course: updateGroup(
                    id: $id,
                    courseId: $courseId,
                    name: $name,
                    drip: $drip 
                ) {
                    courseId,
                    groups {
                        id,
                        name,
                        rank,
                        collapsed,
                        drip {
                            type,
                            status,
                            delayInMillis,
                            dateInUTC,
                            email {
                                content {
                                    content {
                                        blockType,
                                        settings
                                    },
                                    style,
                                    meta
                                },
                                subject
                            }
                        }
                    }
                }
            }
            `;

            const fetcher = fetch
                .setPayload({
                    query: mutation,
                    variables: {
                        id: sectionId,
                        courseId: product?.courseId,
                        drip: {
                            email: {
                                subject: section?.drip?.email?.subject,
                                content: JSON.stringify(emailContent),
                            },
                        },
                    },
                })
                .build();

            try {
                await fetcher.exec();

                // Update initial values after successful save
                initialValues.current = {
                    content: emailContent,
                };
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            } finally {
                setIsSaving(false);
            }
        },
        [sectionId, product?.courseId, section, fetch, toast],
    );

    // Create debounced version of save function
    const debouncedSave = useMemo(() => debounce(saveEmail, 1000), [saveEmail]);

    const handleEmailChange = (newEmailContent: EmailContent) => {
        debouncedSave(newEmailContent);
    };

    if (!productLoaded) {
        return (
            <EmailEditorLayout type="product" isSaving={isSaving}>
                <LoadingState />
            </EmailEditorLayout>
        );
    }

    return (
        <EmailEditorLayout isSaving={isSaving} type="product">
            {email && (
                <EmailEditor email={email} onChange={handleEmailChange} />
            )}
        </EmailEditorLayout>
    );
}

const LoadingState = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading email editor...</div>
    </div>
);
