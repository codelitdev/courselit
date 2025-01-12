"use client";

import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { CreatePostDialog } from "./create-post-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import {
    MessageSquare,
    ThumbsUp,
    Pin,
    MoreVertical,
    Trash,
    FlagTriangleRight,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Comment as CommentType } from "./mock-data";
import { useRouter } from "next/navigation";
import { capitalize, checkPermission, FetchBuilder } from "@courselit/utils";
import { AddressContext, ProfileContext } from "@components/contexts";
import { PaginatedTable, useToast } from "@courselit/components-library";
import {
    CommunityMedia,
    CommunityMemberStatus,
    CommunityPost,
    Constants,
    UIConstants,
} from "@courselit/common-models";
import LoadingSkeleton from "./loading-skeleton";
import { formattedLocaleDate } from "@ui-lib/utils";
import { MediaItem } from "./media-item";
import Image from "next/image";
import MembershipStatus from "./membership-status";
import { TOAST_TITLE_ERROR, TOAST_TITLE_SUCCESS } from "@ui-config/strings";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CommentSection from "./comment-section";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useCommunity } from "@components/hooks/useCommunity";
import NotFound from "@components/admin/not-found";
import { CommunityInfo } from "./info";
import Banner from "./banner";
import { Textarea } from "@/components/ui/textarea";

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
    const [newComments, setNewComments] = useState<{
        [postId: string]: string;
    }>({});
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const [categories, setCategories] = useState<string[]>(["All"]);
    const [memberStatus, setMemberStatus] = useState<
        | {
              status: CommunityMemberStatus;
              rejectionReason?: string;
          }
        | undefined
    >();
    const [page, setPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(
        null,
    );
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [comments, setComments] = useState<CommentType[]>([]);
    const { community, loaded, setCommunity } = useCommunity(id);
    const [refreshCommunityStatus, setRefreshCommunityStatus] = useState(0);
    const { profile } = useContext(ProfileContext);
    const [showReportConfirmation, setShowReportConfirmation] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [postToReport, setPostToReport] = useState<CommunityPost | null>(
        null,
    );

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

    const loadMemberStatus = useCallback(async () => {
        const query = `
            query ($id: String) {
                communityMembershipStatus: getMemberStatus(id: $id) {
                    status,
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
            setMemberStatus(response.communityMembershipStatus);
            setRefreshCommunityStatus((prev) => prev + 1);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    }, [address.backend, id, toast]);

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
            memberStatus?.status.toLowerCase() ===
                Constants.MembershipStatus.ACTIVE
        ) {
            loadPosts();
            loadTotalPosts();
        }
    }, [memberStatus, loadTotalPosts, loadPosts]);

    useEffect(() => {
        if (community) {
            loadPosts();
        }
    }, [page, activeCategory, loadPosts]);

    useEffect(() => {
        if (community) {
            setCategories(["All", ...community.categories]);
            loadMemberStatus();
        }
    }, [community, loadMemberStatus]);

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
            `/dashboard4/community${id ? `/${id}` : ""}?category=${category}`,
        );
    };

    const handleLike = async (postId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();

        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.postId === postId
                    ? {
                          ...post,
                          likesCount: post.hasLiked
                              ? post.likesCount - 1
                              : post.likesCount + 1,
                          hasLiked: !post.hasLiked,
                      }
                    : post,
            ),
        );

        const query = `
            mutation ($communityId: String!, $postId: String!) {
                togglePostLike(communityId: $communityId, postId: $postId) {
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

    const handleCommentLike = (postId: number, commentId: number) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.postId === postId
                    ? {
                          ...post,
                          comments: likeComment(post.comments, commentId),
                      }
                    : post,
            ),
        );
    };

    const likeComment = (
        comments: CommentType[],
        commentId: number,
    ): CommentType[] => {
        return comments.map((comment) =>
            comment.id === commentId
                ? {
                      ...comment,
                      likes: comment.hasLiked
                          ? comment.likes - 1
                          : comment.likes + 1,
                      hasLiked: !comment.hasLiked,
                  }
                : {
                      ...comment,
                      replies: likeComment(comment.replies, commentId),
                  },
        );
    };

    const handleCommentReply = (
        postId: number,
        parentCommentId: number,
        content: string,
    ) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.postId === postId
                    ? {
                          ...post,
                          comments: addReplyToComment(
                              post.comments,
                              parentCommentId,
                              content,
                          ),
                      }
                    : post,
            ),
        );
    };

    const addReplyToComment = (
        comments: CommentType[],
        parentCommentId: number,
        content: string,
    ): CommentType[] => {
        return comments.map((comment) =>
            comment.id === parentCommentId
                ? {
                      ...comment,
                      replies: [
                          ...comment.replies,
                          {
                              id: Date.now(),
                              author: "Current User",
                              avatar: "/placeholder.svg",
                              content,
                              likes: 0,
                              hasLiked: false,
                              time: "Just now",
                              replies: [],
                          },
                      ],
                  }
                : {
                      ...comment,
                      replies: addReplyToComment(
                          comment.replies,
                          parentCommentId,
                          content,
                      ),
                  },
        );
    };

    const handleNewCommentChange = (postId: string, content: string) => {
        setNewComments((prev) => ({ ...prev, [postId]: content }));
    };

    const handlePostComment = (postId: string) => {
        const content = newComments[postId];
        if (content && content.trim()) {
            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.postId === postId
                        ? {
                              ...post,
                              comments: [
                                  ...comments,
                                  {
                                      id: Date.now(),
                                      author: "Current User",
                                      avatar: "/placeholder.svg",
                                      content: content.trim(),
                                      likes: 0,
                                      hasLiked: false,
                                      time: "Just now",
                                      replies: [],
                                  },
                              ],
                          }
                        : post,
                ),
            );
            setNewComments((prev) => ({ ...prev, [postId]: "" }));
        }
    };

    const getPresignedUrl = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/media/presigned`)
            .setIsGraphQLEndpoint(false)
            .build();
        const response = await fetch.exec();
        return response.url;
    };

    const removeFile = async (mediaId: string) => {
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/media/${mediaId}`)
                .setHttpMethod("DELETE")
                .setIsGraphQLEndpoint(false)
                .build();
            const response = await fetch.exec();
            if (response.message !== "success") {
                throw new Error(response.message);
            }
        } catch (err: any) {
            console.error("Error in removing file", err.message);
        }
    };

    const createPost = async (
        newPost: Pick<CommunityPost, "title" | "content" | "category"> & {
            media: MediaItem[];
        },
    ) => {
        if (newPost.media.length > 0) {
            newPost.media = await uploadAttachments(newPost.media);
        }
        const mutation = `
            mutation ($id: String!, $title: String!, $content: String!, $category: String!, $media: [CommunityPostInputMedia]) {
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
            .setPayload({
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
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.post) {
                setPosts((prevPosts) => [response.post, ...prevPosts]);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to add post",
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        }
    };

    const uploadAttachments = async (media: MediaItem[]) => {
        for (const m of media) {
            if (m.file) {
                const uploadedMedia = await uploadFile(m.file);
                m.media = uploadedMedia;
                m.file = undefined;
                m.url = undefined;
            }
        }
        return media;
    };

    const uploadFile = async (file: File) => {
        try {
            const presignedUrl = await getPresignedUrl();
            const media = await uploadToServer(presignedUrl, file);
            return media;
        } catch (err: any) {
            console.error(err.message);
        }
    };

    const uploadToServer = async (
        presignedUrl: string,
        file: File,
    ): Promise<Media> => {
        const fD = new FormData();
        fD.append("caption", file.name);
        fD.append("access", "public");
        fD.append("file", file);

        const res = await fetch(presignedUrl, {
            method: "POST",
            body: fD,
        });
        if (res.status === 200) {
            const media = await res.json();
            if (media) {
                delete media.group;
            }
            return media;
        } else {
            const resp = await res.json();
            throw new Error(resp.error);
        }
    };

    const renderMediaPreview = (
        media: CommunityMedia,
        options?: {
            renderActualFile?: boolean;
        },
    ) => {
        if (!media) return null;

        switch (media.type) {
            case "image":
            case "gif":
                if (media.media) {
                    return (
                        <Image
                            src={
                                options && options.renderActualFile
                                    ? media.media.file!
                                    : media.media.thumbnail
                            }
                            alt="Post media"
                            className="w-24 h-24 object-cover rounded-md"
                            width={96}
                            height={96}
                        />
                    );
                } else {
                    return null;
                }
            case "video":
                if (media.media) {
                    return (
                        <video
                            src={media.media.file}
                            poster={media.media.thumbnail}
                            className="w-24 h-24 object-cover rounded-md"
                        >
                            Your browser does not support the video tag.
                        </video>
                    );
                } else {
                    return null;
                }
            case "youtube":
                return (
                    <img
                        src={`https://img.youtube.com/vi/${media.url.split("/").pop()}/hqdefault.jpg`}
                        alt="YouTube thumbnail"
                        className="w-24 h-24 object-cover rounded-md"
                    />
                );
            case "pdf":
                return (
                    <div className="w-24 h-24 rounded bg-red-500 flex flex-col justify-between">
                        <div>
                            <div className="p-1 mt-1 ml-1 rounded bg-gray-900 text-xs text-white inline-block">
                                PDF
                            </div>
                        </div>
                        <div className="text-sm p-1 truncate text-white">
                            {media.media?.originalFileName}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

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

    const updateBanner = async (json: Record<string, unknown>) => {
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
                        banner: JSON.stringify(json),
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
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
            }
        }
    };

    if (!loaded) {
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
                    status,
                    rejectionReason
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
            setMemberStatus(response.communityMembershipStatus);
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
                setMemberStatus(undefined);
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
            console.error("Error updating community:", error);
        }
    };

    return (
        <div className="container mx-auto p-0">
            {!community?.enabled && (
                <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
                    This community is not enabled. It is not visible to your
                    audience.
                </div>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {profile.name &&
                    memberStatus?.status.toLowerCase() ===
                        Constants.MembershipStatus.ACTIVE ? (
                        <CreatePostDialog
                            categories={categories.filter((x) => x !== "All")}
                            onPostCreated={createPost}
                        />
                    ) : (
                        <MembershipStatus
                            id={id!}
                            status={memberStatus?.status}
                            rejectionReason={memberStatus?.rejectionReason}
                            joiningReasonText={community?.joiningReasonText}
                            key={refreshCommunityStatus}
                            paymentPlan={community?.paymentPlans.find(
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
                                        ? "primary"
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
                        canEdit={checkPermission(profile.permissions, [
                            UIConstants.permissions.manageCommunity,
                        ])}
                        initialBannerText={community?.banner}
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
                                    <Dialog key={post.postId}>
                                        <DialogTrigger asChild>
                                            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                                                <CardHeader className="flex flex-row items-start space-y-0 gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                                <AvatarImage
                                                                    src={
                                                                        post
                                                                            .user
                                                                            .avatar
                                                                            ?.thumbnail ||
                                                                        "/courselit_backdrop_square.webp"
                                                                    }
                                                                    alt={`${post.user.name}'s avatar`}
                                                                />
                                                                <AvatarFallback>
                                                                    {post.user
                                                                        .name &&
                                                                        post.user.name
                                                                            .split(
                                                                                " ",
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    n,
                                                                                ) =>
                                                                                    n[0],
                                                                            )
                                                                            .join(
                                                                                "",
                                                                            )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate text-sm">
                                                                    {post.user
                                                                        .name ||
                                                                        post
                                                                            .user
                                                                            .email}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {formattedLocaleDate(
                                                                        post.updatedAt,
                                                                    )}{" "}
                                                                    •{" "}
                                                                    {capitalize(
                                                                        post.category,
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {checkPermission(
                                                        profile.permissions,
                                                        [
                                                            UIConstants
                                                                .permissions
                                                                .manageCommunity,
                                                        ],
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`flex-shrink-0 rounded-full ${post.pinned ? "bg-accent" : ""}`}
                                                            onClick={(e) =>
                                                                togglePin(
                                                                    post.postId,
                                                                    e,
                                                                )
                                                            }
                                                        >
                                                            <Pin className="h-4 w-4" />
                                                            <span className="sr-only">
                                                                Pin post
                                                            </span>
                                                        </Button>
                                                    )}
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-base mb-4 font-semibold line-clamp-3">
                                                        {post.title}
                                                    </p>
                                                    <p className="text-sm mb-4 line-clamp-3">
                                                        {post.content}
                                                    </p>
                                                    {post.media && (
                                                        <div className="flex gap-2 overflow-x-auto">
                                                            {post.media.map(
                                                                (media) => (
                                                                    <div
                                                                        className="flex-shrink-0"
                                                                        key={
                                                                            media.title
                                                                        }
                                                                    >
                                                                        {renderMediaPreview(
                                                                            media,
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                                <CardFooter>
                                                    <div className="flex items-center gap-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`text-muted-foreground ${post.hasLiked ? "bg-accent" : ""}`}
                                                            onClick={(e) =>
                                                                handleLike(
                                                                    post.postId,
                                                                    e,
                                                                )
                                                            }
                                                        >
                                                            <ThumbsUp className="h-4 w-4 mr-2" />
                                                            {post.likesCount}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-muted-foreground"
                                                        >
                                                            <MessageSquare className="h-4 w-4 mr-2" />
                                                            {post.commentsCount}
                                                        </Button>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        </DialogTrigger>
                                        <DialogContent
                                            className="sm:max-w-[600px] w-full overflow-y-auto max-h-[calc(100vh-4rem)] my-8"
                                            aria-describedby={undefined}
                                        >
                                            <VisuallyHidden>
                                                <DialogTitle>
                                                    Post&apos; content
                                                </DialogTitle>
                                            </VisuallyHidden>
                                            <div className="grid gap-4">
                                                <div className="flex items-center gap-2 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage
                                                                src={
                                                                    post.user
                                                                        .avatar
                                                                        ?.thumbnail ||
                                                                    "/courselit_backdrop_square.webp"
                                                                }
                                                                alt={`${post.user.name}'s avatar`}
                                                            />
                                                            <AvatarFallback>
                                                                {post.user
                                                                    .name &&
                                                                    post.user.name
                                                                        .split(
                                                                            " ",
                                                                        )
                                                                        .map(
                                                                            (
                                                                                n,
                                                                            ) =>
                                                                                n[0],
                                                                        )
                                                                        .join(
                                                                            "",
                                                                        )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold">
                                                                {post.user
                                                                    .name ||
                                                                    post.user
                                                                        .email}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {formattedLocaleDate(
                                                                    post.updatedAt,
                                                                )}{" "}
                                                                •{" "}
                                                                {post.category}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <span className="sr-only">
                                                                    Open menu
                                                                </span>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {checkPermission(
                                                                profile.permissions,
                                                                [
                                                                    UIConstants
                                                                        .permissions
                                                                        .manageCommunity,
                                                                ],
                                                            ) && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        togglePin(
                                                                            post.postId,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pin className="h-4 w-4" />
                                                                    {post.pinned
                                                                        ? "Unpin"
                                                                        : "Pin"}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {profile.userId !==
                                                                post.user
                                                                    .userId && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleReportPost(
                                                                            post,
                                                                        )
                                                                    }
                                                                >
                                                                    <FlagTriangleRight className="h-4 w-4" />{" "}
                                                                    Report
                                                                </DropdownMenuItem>
                                                            )}
                                                            {(checkPermission(
                                                                profile.permissions,
                                                                [
                                                                    UIConstants
                                                                        .permissions
                                                                        .manageCommunity,
                                                                ],
                                                            ) ||
                                                                post.user
                                                                    .userId ===
                                                                    profile.userId) && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleDeletePost(
                                                                            post,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <p>{post.content}</p>
                                                {post.media &&
                                                    post.media.map((media) => (
                                                        <div
                                                            className="flex-shrink-0"
                                                            key={media.title}
                                                        >
                                                            {renderMediaPreview(
                                                                media,
                                                                {
                                                                    renderActualFile:
                                                                        true,
                                                                },
                                                            )}
                                                        </div>
                                                    ))}
                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`text-muted-foreground ${post.hasLiked ? "bg-accent" : ""}`}
                                                        onClick={() =>
                                                            handleLike(
                                                                post.postId,
                                                            )
                                                        }
                                                    >
                                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                                        {post.likesCount}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground"
                                                    >
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        {post.commentsCount}
                                                    </Button>
                                                </div>
                                                {/* 
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                                        {post.comments.map((comment) => (
                                            <Comment
                                                key={comment.id}
                                                comment={comment}
                                                onLike={(commentId) =>
                                                    handleCommentLike(
                                                        post.id,
                                                        commentId,
                                                    )
                                                }
                                                onReply={(commentId, content) =>
                                                    handleCommentReply(
                                                        post.id,
                                                        commentId,
                                                        content,
                                                    )
                                                }
                                            />
                                        ))}
                                        <div ref={commentsEndRef} />
                                    </div>
                                    <Textarea
                                        placeholder="Add a comment..."
                                        value={newComments[post.postId] || ""}
                                        onChange={(e) =>
                                            handleNewCommentChange(
                                                post.postId,
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <Button
                                        onClick={() => handlePostComment(post.postId)}
                                    >
                                        Post Comment
                                    </Button>
*/}
                                                <CommentSection
                                                    postId={post.postId}
                                                    communityId={id!}
                                                    onPostUpdated={(
                                                        postId: string,
                                                        count: number,
                                                    ) => {
                                                        setPosts((prevPosts) =>
                                                            prevPosts.map(
                                                                (p) =>
                                                                    p.postId ===
                                                                    postId
                                                                        ? {
                                                                              ...p,
                                                                              commentsCount:
                                                                                  count,
                                                                          }
                                                                        : p,
                                                            ),
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
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
                            <DialogTitle>Delete Post</DialogTitle>
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
                            membershipStatus={memberStatus?.status.toLowerCase()}
                            rejectionReason={memberStatus?.rejectionReason}
                            paymentPlan={
                                community?.paymentPlans.find(
                                    (plan) =>
                                        plan.planId ===
                                        community?.defaultPaymentPlan,
                                )!
                            }
                            joiningReasonText={community?.joiningReasonText}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
