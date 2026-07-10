"use client";

import { useContext, useEffect, useState } from "react";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";

export function useEnabledCommunities() {
    const address = useContext(AddressContext);
    const [hasEnabledCommunities, setHasEnabledCommunities] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadEnabledCommunitiesCount = async () => {
            const query = `
                query {
                    enabledCommunitiesCount: getCommunitiesCount(publicOnly: true)
                }
            `;

            try {
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload(query)
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetch.exec();

                if (cancelled) {
                    return;
                }

                setHasEnabledCommunities(
                    (response.enabledCommunitiesCount || 0) > 0,
                );
            } catch {
                if (cancelled) {
                    return;
                }

                setHasEnabledCommunities(false);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadEnabledCommunitiesCount();

        return () => {
            cancelled = true;
        };
    }, [address.backend]);

    return {
        hasEnabledCommunities,
        loading,
    };
}
