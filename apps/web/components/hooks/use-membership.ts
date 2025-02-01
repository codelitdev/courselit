import { useState, useEffect, useCallback, useContext } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import { Membership } from "@courselit/common-models";

export const useMembership = (id?: string) => {
    const address = useContext(AddressContext);
    const [membership, setMembership] = useState<
        Pick<Membership, "status" | "role" | "rejectionReason"> | undefined
    >();
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);

    const loadMembership = useCallback(async () => {
        const query = `
            query ($id: String) {
                communityMembership: getMembership(id: $id) {
                    status
                    role
                    rejectionReason
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables: { id } })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            setMembership({
                status: response.communityMembership.status.toLowerCase(),
                role: response.communityMembership.role.toLowerCase(),
                rejectionReason: response.communityMembership.rejectionReason,
            });
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoaded(true);
        }
    }, [address.backend, id]);

    useEffect(() => {
        if (id) {
            loadMembership();
        }
    }, [id, loadMembership]);

    return { membership, setMembership, error, loaded };
};
