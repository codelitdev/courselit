import { AddressContext } from "@components/contexts";
import { Community } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { useState, useEffect, useContext } from "react";

export function useCommunities(
    page: number,
    itemsPerPage: number,
    publicOnly = false,
) {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const address = useContext(AddressContext);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        const fetchCommunities = async () => {
            const query = `
            query ($page: Int, $limit: Int, $publicOnly: Boolean) {
                communities: getCommunities(page: $page, limit: $limit, publicOnly: $publicOnly) {
                    name
                    communityId
                    membersCount
                    featuredImage {
                        thumbnail
                        file
                    }
                    pageId
                    enabled
                },
                totalCommunities: getCommunitiesCount(publicOnly: $publicOnly)
            }`;
            try {
                setLoading(true);
                const fetchRequest = fetch
                    .setPayload({
                        query,
                        variables: {
                            page,
                            limit: itemsPerPage,
                            publicOnly,
                        },
                    })
                    .build();
                const response = await fetchRequest.exec();
                if (response.communities) {
                    setCommunities(response.communities);
                    setTotalPages(response.totalCommunities);
                }
            } catch (e) {
            } finally {
                setLoading(false);
            }
        };

        fetchCommunities();
    }, [page, itemsPerPage, publicOnly]);

    return { communities, loading, totalPages };
}
