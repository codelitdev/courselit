import { FetchBuilder } from "@courselit/utils";
import { TOAST_TITLE_ERROR } from "@/ui-config/strings";
import { useToast } from "@courselit/components-library";

interface DeleteProductProps {
    id?: string;
    backend: string;
    onDeleteComplete?: (...args: any[]) => void;
    toast: ReturnType<typeof useToast>["toast"];
}

export const deleteProduct = async ({
    id,
    backend,
    onDeleteComplete,
    toast,
}: DeleteProductProps) => {
    if (!id) return;

    const query = `
        mutation ($id: String!) {
            result: deleteCourse(id: $id)
        }
    `;

    const fetch = new FetchBuilder()
        .setUrl(`${backend}/api/graph`)
        .setPayload({
            query,
            variables: {
                id,
            },
        })
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();

        if (response.result) {
            onDeleteComplete && onDeleteComplete();
        }
    } catch (err: any) {
        toast({
            title: TOAST_TITLE_ERROR,
            description: err.message,
            variant: "destructive",
        });
    }
};
