"use client";

import { use, useContext, useEffect, useState } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import CommunityPostPage from "./community-post-page";
import { COMMUNITY_HEADER } from "@ui-config/strings";
import { useCommunity } from "@/hooks/use-community";
import { AddressContext } from "@components/contexts";
import { FetchBuilder, truncate } from "@courselit/utils";

export default function Page(props: {
    params: Promise<{ id: string; postId: string }>;
}) {
    const params = use(props.params);
    const { community } = useCommunity(params.id);
    const address = useContext(AddressContext);
    const [postTitle, setPostTitle] = useState("");

    useEffect(() => {
        const query = `
            query ($communityId: String!, $postId: String!) {
                post: getPost(communityId: $communityId, postId: $postId) {
                    title
                }
            }
        `;
        new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId: params.id,
                    postId: params.postId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build()
            .exec()
            .then((res) => {
                if (res.post?.title) setPostTitle(res.post.title);
            })
            .catch(() => {});
    }, [address.backend, params.id, params.postId]);

    const breadcrumbs = [
        {
            label: truncate(community?.name || COMMUNITY_HEADER, 20).trim(),
            href: `/dashboard/community/${params.id}`,
        },
        {
            label: truncate(postTitle, 30).trim() || "Post",
            href: "#",
        },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <CommunityPostPage communityId={params.id} postId={params.postId} />
        </DashboardContent>
    );
}
