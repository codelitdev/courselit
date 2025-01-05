import { AddressContext } from "@components/contexts";
import { Community } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { useState, useEffect, useContext } from "react";

// const MOCK_COMMUNITIES: ContentItem[] = [
//   {
//     entity: {
//       id: "1",
//       title: "React Developers",
//       membersCount: 1234,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "2",
//       title: "UI/UX Design",
//       membersCount: 5678,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "3",
//       title: "DevOps Enthusiasts",
//       membersCount: 3456,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "4",
//       title: "Data Science Hub",
//       membersCount: 7890,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "5",
//       title: "Mobile App Developers",
//       membersCount: 4321,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "6",
//       title: "Blockchain Innovators",
//       membersCount: 2345,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "7",
//       title: "Cloud Computing Experts",
//       membersCount: 6789,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
//   {
//     entity: {
//       id: "8",
//       title: "Cybersecurity Professionals",
//       membersCount: 5432,
//       featuredImage: {
//         file: "/placeholder.svg",
//         thumbnail: "/placeholder.svg"
//       }
//     },
//     entityType: "community"
//   },
// ]

export function useCommunities(page: number, itemsPerPage: number) {
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
            query ($page: Int, $limit: Int) {
                communities: getCommunities(page: $page, limit: $limit) {
                    name
                    communityId
                    membersCount
                    featuredImage {
                        thumbnail
                        file
                    }
                    pageId
                },
                totalCommunities: getCommunitiesCount
            }`;
            try {
                setLoading(true);
                const fetchRequest = fetch
                    .setPayload({
                        query,
                        variables: {
                            page,
                            limit: itemsPerPage,
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
            //   setLoading(true)
            //   // Simulate API call
            //   await new Promise(resolve => setTimeout(resolve, 1000))

            //   const startIndex = (page - 1) * itemsPerPage
            //   const endIndex = startIndex + itemsPerPage
            //   const paginatedCommunities = MOCK_COMMUNITIES.slice(startIndex, endIndex)

            //   setCommunities(paginatedCommunities)
            //   setTotalPages(Math.ceil(MOCK_COMMUNITIES.length / itemsPerPage))
            //   setLoading(false)
        };

        fetchCommunities();
    }, [page, itemsPerPage]);

    return { communities, loading, totalPages };
}
