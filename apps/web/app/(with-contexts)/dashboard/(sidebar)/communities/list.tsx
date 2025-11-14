"use client";

import { AddressContext } from "@components/contexts";
import { Community } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    startTransition,
} from "react";
import {
    Button,
    Link,
    PaginatedTable,
    Table,
    TableBody,
    TableHead,
    TableRow,
    Tooltip,
} from "@courselit/components-library";
import {
    MANAGE_COMMUNITIES_PAGE_HEADING,
    NEW_COMMUNITY_BUTTON,
} from "@ui-config/strings";
import { Eye, Settings } from "lucide-react";

const communitiesResultsLimit = 10;

export default function List() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const address = useContext(AddressContext);

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const loadCommunities = useCallback(async () => {
        const query = `
            query ($page: Int, $limit: Int) {
                communities: getCommunities(page: $page, limit: $limit) {
                    name,
                    pageId
                    communityId,
                    membersCount
                },
                totalCommunities: getCommunitiesCount
            }`;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        page,
                        limit: communitiesResultsLimit,
                    },
                })
                .build();
            const response = await fetchRequest.exec();
            if (response.communities) {
                setCommunities(response.communities);
                setTotal(response.totalCommunities);
            }
        } catch (e) {}
    }, [fetch, page]);

    useEffect(() => {
        startTransition(() => {
            void loadCommunities();
        });
    }, [loadCommunities]);

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_COMMUNITIES_PAGE_HEADING}
                </h1>
                <div>
                    <Link href={`/dashboard/community/new`}>
                        <Button>{NEW_COMMUNITY_BUTTON}</Button>
                    </Link>
                </div>
            </div>
            <PaginatedTable
                page={page}
                totalPages={Math.ceil(total / communitiesResultsLimit)}
                onPageChange={setPage}
            >
                <Table aria-label="Communities" className="mb-4 w-full">
                    <TableHead className="border-0 border-b border-slate-200">
                        <td>Name</td>
                        <td align="right">Members</td>
                        <td align="right">Actions</td>
                    </TableHead>
                    <TableBody>
                        {communities.map((community) => (
                            <TableRow key={community.communityId}>
                                <td className="py-4">
                                    <Link
                                        href={`/dashboard/community/${community.communityId}`}
                                    >
                                        {community.name}
                                    </Link>
                                </td>
                                <td className="py-4" align="right">
                                    {community.membersCount}
                                </td>
                                <td align="right">
                                    <div className="flex space-x-2 justify-end">
                                        <Link href={`/p/${community.pageId}`}>
                                            <Tooltip title="View page">
                                                <Button variant="soft">
                                                    <Eye width={16} />{" "}
                                                </Button>
                                            </Tooltip>
                                        </Link>
                                        <Link
                                            href={`/dashboard/community/${community.communityId}/manage`}
                                        >
                                            <Tooltip title="Settings">
                                                <Button variant="soft">
                                                    <Settings width={16} />{" "}
                                                </Button>
                                            </Tooltip>
                                        </Link>
                                    </div>
                                </td>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </PaginatedTable>
        </div>
    );
}
