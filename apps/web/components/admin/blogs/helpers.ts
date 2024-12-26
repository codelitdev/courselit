import { AppDispatch } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    APP_MESSAGE_COURSE_DELETED,
    ERROR_SNACKBAR_PREFIX,
} from "../../../ui-config/strings";

interface DeleteProductProps {
    id: string;
    backend: string;
    dispatch?: AppDispatch;
    onDeleteComplete?: (...args: any[]) => void;
    toast: (options: { title: string; description: string }) => void;
}

export const deleteProduct = async ({
    id,
    backend,
    dispatch,
    onDeleteComplete,
    toast,
}: DeleteProductProps) => {
    const query = `
    mutation {
      result: deleteCourse(id: "${id}")
    }
    `;

    const fetch = new FetchBuilder()
        .setUrl(`${backend}/api/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        dispatch && dispatch(networkAction(true));
        const response = await fetch.exec();

        if (response.result) {
            onDeleteComplete && onDeleteComplete();
            // onDelete(position);
        }
    } catch (err: any) {
        toast &&
            toast({
                title: ERROR_SNACKBAR_PREFIX,
                description: err.message,
            });
    } finally {
        dispatch && dispatch(networkAction(false));
        toast &&
            toast({
                title: "",
                description: APP_MESSAGE_COURSE_DELETED,
            });
    }
};
