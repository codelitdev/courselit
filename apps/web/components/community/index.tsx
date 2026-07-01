"use client";

import {
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
    useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    PaginatedTable,
    useToast,
    useMediaLit,
} from "@courselit/components-library";
import {
    CommunityMedia,
    CommunityPost,
    Constants,
    Media,
    TextEditorContent,
} from "@courselit/common-models";
import LoadingSkeleton from "./loading-skeleton";
import { formattedLocaleDate, hasCommunityPermission } from "@ui-lib/utils";
import { MediaItem } from "./media-item";
import MembershipStatus from "./membership-status";
import {
    MANAGE_LINK_TEXT,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useCommunity } from "@/hooks/use-community";
import { useMembership } from "@/hooks/use-membership";
import NotFound from "@components/admin/not-found";
import { CommunityInfo } from "./info";
import Banner from "./banner";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import dynamic from "next/dynamic";
import CommunityPostCard from "./post-card";
import CommunityPostMediaPreview from "./post-media-preview";

const CreatePostDialog = dynamic(() => import("./create-post-dialog"));

const itemsPerPage = 10;

export function CommunityForum({
    id,
    activeCategory = "All",
}: {
    id?: string;
    activeCategory?: string;
}) {
    const router = useRouter();
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const [categories, setCategories] = useState<string[]>(["All"]);
    const postCategories = useMemo(
        () => categories.filter((x) => x !== "All"),
        [categories],
    );
    const [page, setPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(
        null,
    );
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const { community, loaded, setCommunity } = useCommunity(id);
    const { membership, setMembership } = useMembership(id);
    const { profile } = useContext(ProfileContext);
    const [showReportConfirmation, setShowReportConfirmation] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [postToReport, setPostToReport] = useState<CommunityPost | null>(
        null,
    );
    const [postToEdit, setPostToEdit] = useState<CommunityPost | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [refreshCommunityStatus, setRefreshCommunityStatus] = useState(0);
    const { isUploading, uploadProgress, uploadFile } = useMediaLit({
        signatureEndpoint: `${address.backend}/api/media/presigned`,
        access: "public",
    });
    const [fileBeingUploadedNumber, setFileBeingUploadedNumber] = useState(0);

    const formatTimestamp = (value?: string) => formattedLocaleDate(value);

    useEffect(() => {
        if (membership) {
            setRefreshCommunityStatus((prev) => prev + 1);
        }
    }, [membership]);

    const loadTotalPosts = useCallback(async () => {
        const query = `
            query ($communityId: String!, $category: String) {
                totalPosts: getPostsCount(communityId: $communityId, category: $category)
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId: id,
                    category:
                        activeCategory === "All" ? undefined : activeCategory,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.totalPosts) {
                setTotalPosts(response.totalPosts);
            } else {
                setTotalPosts(0);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    }, [id, activeCategory, address.backend, toast]);

    const loadPosts = useCallback(async () => {
        const query = `
            query ($communityId: String!, $page: Int!, $limit: Int!, $category: String) {
                posts: getPosts(communityId: $communityId, category: $category, page: $page, limit: $limit) {
                    communityId
                    postId
                    title
                    content
                    category
                    media {
                        type
                        title
                        url
                        media {
                            mediaId
                            file
                            thumbnail
                            originalFileName
                            size
                        }
                    }
                    likesCount
                    reactions {
                        emoji
                        count
                        hasReacted
                        reactors {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                    }
                    commentsCount
                    updatedAt
                    hasLiked
                    user {
                        userId
                        name
                        avatar {
                            mediaId
                            file
                            thumbnail
                        }
                    }
                    pinned
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    communityId: id,
                    category:
                        activeCategory === "All" ? undefined : activeCategory,
                    page,
                    limit: itemsPerPage,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.posts) {
                setPosts(response.posts);
            } else {
                setPosts([]);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    }, [address.backend, activeCategory, id, page, toast]);

    useEffect(() => {
        if (
            community &&
            membership?.status === Constants.MembershipStatus.ACTIVE
        ) {
            loadPosts();
            loadTotalPosts();
        }
    }, [membership, community, loadTotalPosts, loadPosts]);

    useEffect(() => {
        if (community) {
            loadPosts();
        }
    }, [page, activeCategory, loadPosts]);

    useEffect(() => {
        if (community) {
            setCategories(["All", ...community.categories]);
        }
    }, [community]);

    useEffect(() => {
        if (community) {
            setPage(1);
            loadTotalPosts();
        }
    }, [activeCategory, loadTotalPosts]);

    useEffect(() => {
        scrollToBottom();
    }, [posts]);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const visibleCategories = showAllCategories
        ? categories
        : categories.slice(0, 3);

    const toggleCategories = () => {
        setShowAllCategories((prev) => !prev);
    };

    const handleCategoryClick = (category: string) => {
        router.push(
            `/dashboard/community${id ? `/${id}` : ""}?category=${category}`,
        );
    };

    const handleReact = async (
        postId: string,
        emoji: string,
        e?: React.MouseEvent,
    ) => {
        e?.stopPropagation();

        const query = `
            mutation ($communityId: String!, $postId: String!, $emoji: String!) {
                togglePostReaction(communityId: $communityId, postId: $postId, emoji: $emoji) {
                    postId
                    reactions {
                        emoji
                        count
                        hasReacted
                        reactors {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                    }
                }
            }
        `;
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { postId, communityId: id, emoji },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.togglePostReaction) {
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.postId === postId
                            ? {
                                  ...post,
                                  reactions:
                                      response.togglePostReaction.reactions,
                              }
                            : post,
                    ),
                );
            }
        } catch (err) {
            console.error(err.message);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        }
    };

    const togglePin = async (postId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.postId === postId
                    ? { ...post, pinned: !post.pinned }
                    : post,
            ),
        );
        const query = `
            mutation ($communityId: String!, $postId: String!) {
                togglePinned(communityId: $communityId, postId: $postId) {
                    postId
                }
            }
        `;
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { postId, communityId: id },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            await fetch.exec();
        } catch (err) {
            console.error(err.message);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        }
    };

    const createPost = useCallback(
        async (
            newPost: Pick<CommunityPost, "title" | "content" | "category"> & {
                media: MediaItem[];
                postId?: string;
            },
        ) => {
            try {
                if (newPost.media.length > 0) {
                    newPost.media = await uploadAttachments(newPost.media);
                }

                const effectivePostId =
                    newPost.postId ||
                    (isEditModalOpen ? postToEdit?.postId : undefined);
                const isEdit = !!effectivePostId;
                const mutation = isEdit
                    ? `
                mutation ($communityId: String!, $postId: String!, $title: String, $content: JSONObject, $category: String, $media: [CommunityPostInputMedia]) {
                    post: updateCommunityPost(
                        communityId: $communityId,
                        postId: $postId,
                        title: $title,
                        content: $content,
                        category: $category,
                        media: $media
                    ) {
                        communityId
                        postId
                        title
                        content
                        category
                        media {
                            type
                            title
                            url
                            media {
                                mediaId
                                file
                                thumbnail
                                originalFileName
                                size
                            }
                        }
                        likesCount
                        commentsCount
                        updatedAt
                        hasLiked
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        pinned
                    }
                }
            `
                    : `
                mutation ($id: String!, $title: String!, $content: JSONObject!, $category: String!, $media: [CommunityPostInputMedia]) {
                    post: createCommunityPost(
                        id: $id,
                        title: $title,
                        content: $content,
                        category: $category,
                        media: $media
                    ) {
                        communityId
                        postId
                        title
                        content
                        category
                        media {
                            type
                            title
                            url
                            media {
                                mediaId
                                file
                                thumbnail
                                originalFileName
                                size
                            }
                        }
                        likesCount
                        commentsCount
                        updatedAt
                        hasLiked
                        user {
                            userId
                            name
                            avatar {
                                mediaId
                                file
                                thumbnail
                            }
                        }
                        pinned
                    }
                }
            `;

                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload(
                        isEdit
                            ? {
                                  query: mutation,
                                  variables: {
                                      communityId: community?.communityId,
                                      postId: effectivePostId,
                                      content: newPost.content,
                                      category: newPost.category,
                                      title: newPost.title,
                                      media: newPost.media.map((m) => ({
                                          type: m.type,
                                          title: m.title,
                                          url: m.url,
                                          media: m.media,
                                      })),
                                  },
                              }
                            : {
                                  query: mutation,
                                  variables: {
                                      id: community?.communityId,
                                      content: newPost.content,
                                      category: newPost.category,
                                      title: newPost.title,
                                      media: newPost.media.map((m) => ({
                                          type: m.type,
                                          title: m.title,
                                          url: m.url,
                                          media: m.media,
                                      })),
                                  },
                              },
                    )
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetch.exec();
                if (response.post) {
                    if (isEdit) {
                        setPosts((prevPosts) =>
                            prevPosts.map((p) =>
                                p.postId === response.post.postId
                                    ? response.post
                                    : p,
                            ),
                        );
                        setIsEditModalOpen(false);
                        setPostToEdit(null);
                    } else {
                        setPosts((prevPosts) => [response.post, ...prevPosts]);
                    }
                } else {
                    toast({
                        title: "Error",
                        description: isEdit
                            ? "Failed to update post"
                            : "Failed to add post",
                    });
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setFileBeingUploadedNumber(0);
            }
        },
        [
            address.backend,
            community?.communityId,
            isEditModalOpen,
            postToEdit?.postId,
        ],
    );

    const uploadAttachments = async (media: MediaItem[]) => {
        for (const i in media) {
            const m = media[i];
            if (m.file) {
                setFileBeingUploadedNumber(+i + 1);
                // TODO: Add file size limit
                const uploadedMedia = (await uploadFile(
                    m.file,
                )) as unknown as Media;
                m.media = uploadedMedia;
                m.file = undefined;
                m.url = undefined;
            }
        }
        return media;
    };

    const renderMediaPreview = (media: CommunityMedia) => (
        <CommunityPostMediaPreview media={media} />
    );

    const handleDeletePost = (post: CommunityPost) => {
        setPostToDelete(post);
        setShowDeleteConfirmation(true);
    };

    const confirmDeletePost = async () => {
        if (postToDelete) {
            const query = `
                mutation ($communityId: String!, $postId: String!) {
                    post: deleteCommunityPost(communityId: $communityId, postId: $postId) {
                        communityId
                        postId
                    }
                }
            `;

            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        communityId: id,
                        postId: postToDelete.postId,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                const response = await fetch.exec();
                if (!response.post) {
                    toast({
                        title: "Error",
                        description: "Failed to delete post",
                        variant: "destructive",
                    });
                } else {
                    setPosts((prevPosts) =>
                        prevPosts.filter(
                            (post) => post.postId !== postToDelete.postId,
                        ),
                    );
                    setShowDeleteConfirmation(false);
                    setPostToDelete(null);
                }
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
            }
        }
    };

    const updateBanner = async (json: TextEditorContent) => {
        const query = `
            mutation UpdateCommunity(
                $id: String!
                $banner: String 
            ) {
                community: updateCommunity(
                    id: $id
                    banner: $banner
                ) {
                    communityId
                    name
                    description
                    enabled
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                    pageId
                    paymentPlans {
                        planId
                        name
                        type
                        oneTimeAmount
                        emiAmount
                        emiTotalInstallments
                        subscriptionMonthlyAmount
                        subscriptionYearlyAmount
                    }
                    defaultPaymentPlan
                    featuredImage {
                        mediaId
                        originalFileName
                        mimeType
                        size
                        access
                        file
                        thumbnail
                        caption
                    }
                    membersCount
                }
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                        banner: JSON.stringify(
                            json as unknown as Record<string, unknown>,
                        ),
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.community) {
                setCommunity(response.community);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: response.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleReportPost = (post: CommunityPost) => {
        setPostToReport(post);
        setShowReportConfirmation(true);
    };

    const confirmReportPost = async () => {
        if (postToReport && reportReason.trim()) {
            const query = `
                mutation ($communityId: String!, $contentId: String!, $type: CommunityReportContentType!, $reason: String!) {
                    report: reportCommunityContent(communityId: $communityId, contentId: $contentId, type: $type, reason: $reason) {
                        communityId
                        reportId
                        content {
                            id
                            content
                        }
                        type
                        reason
                        status
                        rejectionReason
                        createdAt
                        updatedAt
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        communityId: id,
                        contentId: postToReport.postId,
                        type: Constants.CommunityReportType.POST.toUpperCase(),
                        reason: reportReason,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                await fetch.exec();
                toast({
                    title: "Reported",
                    description: "Post has been reported",
                });
                setShowReportConfirmation(false);
                setPostToReport(null);
                setReportReason("");
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            }
        }
    };

    if (!loaded || !profile) {
        return <LoadingSkeleton />;
    }

    if (loaded && !community) {
        return (
            <NotFound
                resource="Community"
                backLink="/"
                backLinkText="Back to Home"
            />
        );
    }

    const handleJoin = async (joiningReason?: string) => {
        const query = `
            mutation JoinCommunity(
                $id: String!
                $joiningReason: String!
            ) {
                communityMembershipStatus: joinCommunity(
                    id: $id
                    joiningReason: $joiningReason
                ) {
                    status
                    rejectionReason
                    role
                } 
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                        joiningReason,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            setMembership(response.communityMembershipStatus);
            setRefreshCommunityStatus((prev) => prev + 1);
            if (response.communityMembershipStatus) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: `Your request to join has been sent.`,
                });
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: response.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleLeave = async () => {
        const query = `
            mutation LeaveCommunity(
                $id: String!
            ) {
                communityMembershipStatus: leaveCommunity(
                    id: $id
                ) {
                    status,
                } 
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.communityMembershipStatus) {
                setMembership(undefined);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: `You have left the community.`,
                });
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: response.error,
                });
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto p-0">
            {!community?.enabled && (
                <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
                    This community is not enabled. It is not visible to your
                    audience (including moderators). {""}
                    <Link
                        href={`/dashboard/community/${id}/manage`}
                        className="underline"
                    >
                        {MANAGE_LINK_TEXT}
                    </Link>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {profile.name &&
                    membership?.status.toLowerCase() ===
                        Constants.MembershipStatus.ACTIVE ? (
                        hasCommunityPermission(
                            membership,
                            Constants.MembershipRole.POST,
                        ) ? (
                            <CreatePostDialog
                                categories={postCategories}
                                createPost={createPost}
                                isFileUploading={isUploading}
                                fileUploadProgress={uploadProgress}
                                fileBeingUploadedNumber={
                                    fileBeingUploadedNumber
                                }
                            />
                        ) : null
                    ) : (
                        <MembershipStatus
                            id={id!}
                            membership={membership}
                            joiningReasonText={community?.joiningReasonText}
                            key={refreshCommunityStatus}
                            paymentPlan={community?.paymentPlans?.find(
                                (plan) =>
                                    plan.planId ===
                                    community?.defaultPaymentPlan,
                            )}
                        />
                    )}

                    <div className="flex gap-2 flex-wrap">
                        {visibleCategories.map((category, index) => (
                            <Button
                                key={category}
                                variant={
                                    category === activeCategory
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                className={`rounded-full ${category === activeCategory ? "bg-gray-500 text-white" : ""}`}
                                onClick={() => handleCategoryClick(category)}
                            >
                                {category}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={toggleCategories}
                        >
                            {showAllCategories ? "Less" : "More..."}
                        </Button>
                    </div>

                    <Banner
                        canEdit={
                            membership
                                ? hasCommunityPermission(
                                      membership,
                                      Constants.MembershipRole.MODERATE,
                                  )
                                : false
                        }
                        initialBannerText={
                            community?.banner as TextEditorContent | undefined
                        }
                        onSaveBanner={updateBanner}
                    />

                    <PaginatedTable
                        page={page}
                        totalPages={Math.ceil(totalPosts / itemsPerPage)}
                        onPageChange={setPage}
                    >
                        <div className="flex flex-col gap-4 mb-4">
                            {posts.length > 0 ? (
                                posts.map((post) => (
                                    <CommunityPostCard
                                        key={post.postId}
                                        post={post}
                                        canModerate={
                                            !!membership &&
                                            hasCommunityPermission(
                                                membership,
                                                Constants.MembershipRole
                                                    .MODERATE,
                                            )
                                        }
                                        formatTimestamp={formatTimestamp}
                                        renderMediaPreview={renderMediaPreview}
                                        onOpen={(postId) =>
                                            router.push(
                                                `/dashboard/community/${id}/${postId}`,
                                            )
                                        }
                                        onTogglePin={togglePin}
                                        onReact={handleReact}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    No posts found.
                                </div>
                            )}
                        </div>
                    </PaginatedTable>
                    <Dialog
                        open={showDeleteConfirmation}
                        onOpenChange={setShowDeleteConfirmation}
                    >
                        <DialogContent>
                            <DialogTitle>Delete post</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this post? This
                                action cannot be undone.
                            </DialogDescription>
                            <DialogFooter>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        setShowDeleteConfirmation(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDeletePost}
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={showReportConfirmation}
                        onOpenChange={setShowReportConfirmation}
                    >
                        <DialogContent>
                            <DialogTitle>Report Post</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for reporting this post.
                            </DialogDescription>
                            <Textarea
                                placeholder="Reason for reporting..."
                                value={reportReason}
                                onChange={(e) =>
                                    setReportReason(e.target.value)
                                }
                            />
                            <DialogFooter>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        setShowReportConfirmation(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmReportPost}
                                    disabled={!reportReason.trim()}
                                >
                                    Submit
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <CreatePostDialog
                        postId={postToEdit?.postId}
                        title={postToEdit?.title}
                        content={postToEdit?.content}
                        category={postToEdit?.category}
                        media={postToEdit?.media}
                        categories={postCategories}
                        createPost={createPost}
                        isFileUploading={isUploading}
                        fileUploadProgress={uploadProgress}
                        fileBeingUploadedNumber={fileBeingUploadedNumber}
                        isOpen={isEditModalOpen}
                        hideTrigger={true}
                        onOpenChange={(open) => {
                            setIsEditModalOpen(open);
                            if (!open) {
                                setPostToEdit(null);
                            }
                        }}
                    />
                </div>
                <div className="lg:col-start-3 lg:row-start-1">
                    {community && (
                        <CommunityInfo
                            id={community?.communityId}
                            name={community?.name}
                            description={community?.description}
                            image={
                                community?.featuredImage?.file ||
                                "/courselit_backdrop_square.webp"
                            }
                            memberCount={community?.membersCount}
                            membership={membership}
                            paymentPlan={community?.paymentPlans?.find(
                                (plan) =>
                                    plan.planId ===
                                    community?.defaultPaymentPlan,
                            )}
                            joiningReasonText={community?.joiningReasonText}
                            pageId={community?.pageId}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
