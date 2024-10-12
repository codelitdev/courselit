import { AppMessage } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { APP_MESSAGE_COURSE_DELETED } from "../../../ui-config/strings";

interface DeleteProductProps {
    id: string;
    backend: string;
    dispatch?: AppDispatch;
    onDeleteComplete?: (...args: any[]) => void;
}
export const deleteProduct = async ({
    id,
    backend,
    dispatch,
    onDeleteComplete,
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
        console.error(err);
        dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
        dispatch && dispatch(networkAction(false));
        dispatch &&
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED)));
    }
};
