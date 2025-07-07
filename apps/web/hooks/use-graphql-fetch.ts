import { useMemo, useContext } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";

export function useGraphQLFetch() {
    const address = useContext(AddressContext);

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    return fetch;
}
