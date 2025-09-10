import {
    Form,
    FormField,
    Link,
    Button,
    useToast,
} from "@courselit/components-library";
import {
    BTN_CONTINUE,
    BUTTON_CANCEL_TEXT,
    TOAST_TITLE_ERROR,
    NEW_PAGE_FORM_WARNING,
    NEW_PAGE_HEADING,
    NEW_PAGE_NAME_PLC,
    NEW_PAGE_URL_LABEL,
    NEW_PAGE_URL_PLC,
    PAGES_TABLE_HEADER_NAME,
} from "@ui-config/strings";
import { FormEvent, useContext, useEffect, useState } from "react";
import { FetchBuilder, slugify } from "@courselit/utils";
import { Info } from "@courselit/icons";
import { useRouter } from "next/navigation";
import { AddressContext } from "@components/contexts";

const NewPage = () => {
    const [name, setName] = useState("");
    const [pageId, setPageId] = useState("");
    const [loading, setLoading] = useState(false);
    const address = useContext(AddressContext);
    const router = useRouter();
    const { toast } = useToast();

    const createPage = async (e: FormEvent<HTMLInputElement>) => {
        e.preventDefault();

        const query = `
            mutation {
                page: createPage(
                    name: "${name}",
                    pageId: "${pageId}"
                ) {
                    pageId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.page) {
                router.replace(
                    `/dashboard/page/${response.page.pageId}?redirectTo=/dashboard/pages`,
                );
            }
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

    useEffect(() => {
        setPageId(slugify(name));
    }, [name]);

    return (
        <div className="flex flex-col">
            <h1 className="text-4xl font-semibold mb-4">{NEW_PAGE_HEADING}</h1>
            <Form onSubmit={createPage} className="flex flex-col gap-4">
                <FormField
                    required
                    label={PAGES_TABLE_HEADER_NAME}
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={NEW_PAGE_NAME_PLC}
                />
                <FormField
                    required
                    label={NEW_PAGE_URL_LABEL}
                    name="pageId"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder={NEW_PAGE_URL_PLC}
                />
                <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Info />
                    {NEW_PAGE_FORM_WARNING}
                </p>
                <div className="flex gap-2">
                    <Button
                        disabled={
                            !name ||
                            !pageId ||
                            (!!name && !!pageId && loading) ||
                            loading
                        }
                        onClick={createPage}
                        sx={{ mr: 1 }}
                    >
                        {BTN_CONTINUE}
                    </Button>
                    <Link href="/dashboard/pages">
                        <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                    </Link>
                </div>
            </Form>
        </div>
    );
};

export default NewPage;
