"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import {
    CommunityMedia,
    CommunityPost,
    Constants,
    Media,
} from "@courselit/common-models";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { formattedLocaleDate, hasCommunityPermission } from "@ui-lib/utils";
import LoadingSkeleton from "@components/community/loading-skeleton";
import { useCommunity } from "@/hooks/use-community";
import { useMembership } from "@/hooks/use-membership";
import NotFound from "@components/admin/not-found";
import { CommunityInfo } from "@components/community/info";
import MembershipStatus from "@components/community/membership-status";
import CommentSection from "@components/community/comment-section";
import dynamic from "next/dynamic";
import { useMediaLit, useToast } from "@courselit/components-library";
import {
    MANAGE_LINK_TEXT,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    MoreVertical,
    Trash,
    FlagTriangleRight,
    MessageSquare,
    ThumbsUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { MediaItem } from "@components/community/media-item";
import { Textarea } from "@/components/ui/textarea";
import { TextRenderer } from "@courselit/page-blocks";
import CommunityPostMediaPreview from "@components/community/post-media-preview";

const CreatePostDialog = dynamic(
    () => import("@components/community/create-post-dialog"),
);

export default function CommunityPostPage({
    communityId,
    postId,
}: {
    communityId: string;
    postId: string;
}) {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const { community, loaded } = useCommunity(communityId);
    const { membership, setMembership } = useMembership(communityId);
    const [post, setPost] = useState<CommunityPost | null>(null);
    const [postLoaded, setPostLoaded] = useState(false);
    const [fullscreenMedia, setFullscreenMedia] =
        useState<CommunityMedia | null>(null);
    const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(
        null,
    );
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
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
    const { theme } = useContext(ThemeContext);

    const formatTimestamp = (value?: string) => formattedLocaleDate(value);

    useEffect(() => {
        if (membership) {
            setRefreshCommunityStatus((prev) => prev + 1);
        }
    }, [membership]);

    const loadPost = useCallback(async () => {
        const query = `
            query ($communityId: String!, $postId: String!) {
                post: getPost(communityId: $communityId, postId: $postId) {
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
                        email
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

        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { communityId, postId },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            setPost(response.post || null);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setPostLoaded(true);
        }
    }, [address.backend, communityId, postId, toast]);

    useEffect(() => {
        loadPost();
    }, [loadPost]);

    const handleLike = async (targetPostId: string) => {
        setPost((prev) =>
            prev && prev.postId === targetPostId
                ? {
                      ...prev,
                      likesCount: prev.hasLiked
                          ? prev.likesCount - 1
                          : prev.likesCount + 1,
                      hasLiked: !prev.hasLiked,
                  }
                : prev,
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
                    variables: { communityId, postId: targetPostId },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            await fetch.exec();
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
            loadPost();
        }
    };

    const uploadAttachments = useCallback(
        async (media: MediaItem[]) => {
            for (const i in media) {
                const m = media[i];
                if (m.file) {
                    setFileBeingUploadedNumber(+i + 1);
                    const uploadedMedia = (await uploadFile(
                        m.file,
                    )) as unknown as Media;
                    m.media = uploadedMedia;
                    m.file = undefined;
                    m.url = undefined;
                }
            }
            return media;
        },
        [uploadFile],
    );

    const createPost = useCallback(
        async (
            newPost: Pick<CommunityPost, "title" | "content" | "category"> & {
                media: MediaItem[];
            },
        ) => {
            try {
                if (newPost.media.length > 0) {
                    newPost.media = await uploadAttachments(newPost.media);
                }

                const query = `
                    mutation ($communityId: String!, $postId: String!, $title: String, $content: JSONObject, $category: String, $media: [CommunityPostInputMedia]) {
                        post: updateCommunityPost(
                            communityId: $communityId
                            postId: $postId
                            title: $title
                            content: $content
                            category: $category
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
                                email
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
                            communityId,
                            postId,
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

                const response = await fetch.exec();
                if (response.post) {
                    setPost(response.post);
                    setPostToEdit(null);
                    setIsEditModalOpen(false);
                }
            } catch (error: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            }
        },
        [address.backend, communityId, postId, toast, uploadAttachments],
    );

    const handleDeletePost = (targetPost: CommunityPost) => {
        setPostToDelete(targetPost);
        setShowDeleteConfirmation(true);
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;

        const query = `
            mutation ($communityId: String!, $postId: String!) {
                post: deleteCommunityPost(communityId: $communityId, postId: $postId) {
                    communityId
                    postId
                }
            }
        `;

        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { communityId, postId: postToDelete.postId },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.post) {
                window.location.assign(`/dashboard/community/${communityId}`);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const handleReportPost = (targetPost: CommunityPost) => {
        setPostToReport(targetPost);
        setShowReportConfirmation(true);
    };

    const confirmReportPost = async () => {
        if (!postToReport || !reportReason.trim()) return;

        const query = `
            mutation ($communityId: String!, $contentId: String!, $type: CommunityReportContentType!, $reason: String!) {
                report: reportCommunityContent(communityId: $communityId, contentId: $contentId, type: $type, reason: $reason) {
                    reportId
                }
            }
        `;
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        communityId,
                        contentId: postToReport.postId,
                        type: Constants.CommunityReportType.POST.toUpperCase(),
                        reason: reportReason,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
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
    };

    const handleJoin = async (joiningReason?: string) => {
        const query = `
            mutation JoinCommunity($id: String!, $joiningReason: String!) {
                communityMembershipStatus: joinCommunity(id: $id, joiningReason: $joiningReason) {
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
                    variables: { id: communityId, joiningReason },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            setMembership(response.communityMembershipStatus);
            setRefreshCommunityStatus((prev) => prev + 1);
            if (response.communityMembershipStatus) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: "Your request to join has been sent.",
                });
            }
        } catch (error: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleLeave = async () => {
        const query = `
            mutation LeaveCommunity($id: String!) {
                communityMembershipStatus: leaveCommunity(id: $id) {
                    status
                } 
            }
        `;
        try {
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: { id: communityId },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.communityMembershipStatus) {
                setMembership(undefined);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: "You have left the community.",
                });
            }
        } catch (error: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    if (!loaded || !profile || !postLoaded) {
        return <LoadingSkeleton />;
    }

    if ((loaded && !community) || (postLoaded && !post)) {
        return (
            <NotFound
                resource="Community post"
                backLink={`/dashboard/community/${communityId}`}
                backLinkText="Back to community"
            />
        );
    }

    const currentPost = post!;

    return (
        <div className="container mx-auto p-0">
            {!community?.enabled && (
                <div className="mb-4 rounded-md bg-red-400 p-2 text-sm text-white">
                    This community is not enabled. It is not visible to your
                    audience (including moderators).{" "}
                    <Link
                        href={`/dashboard/community/${communityId}/manage`}
                        className="underline"
                    >
                        {MANAGE_LINK_TEXT}
                    </Link>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {profile.name &&
                    membership?.status.toLowerCase() ===
                        Constants.MembershipStatus.ACTIVE ? null : (
                        <MembershipStatus
                            id={communityId}
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

                    <div className="space-y-4 rounded-lg border bg-card p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage
                                        src={
                                            currentPost.user.avatar?.file ||
                                            "/courselit_backdrop_square.webp"
                                        }
                                        alt={`${currentPost.user.name}'s avatar`}
                                    />
                                    <AvatarFallback>
                                        {currentPost.user.name &&
                                            currentPost.user.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm">
                                        {currentPost.user.name ||
                                            currentPost.user.email}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatTimestamp(currentPost.updatedAt)}{" "}
                                        • {currentPost.category}
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {profile.userId !==
                                        currentPost.user.userId && (
                                        <DropdownMenuItem
                                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                            onClick={() =>
                                                handleReportPost(currentPost)
                                            }
                                        >
                                            <FlagTriangleRight className="h-4 w-4" />
                                            Report
                                        </DropdownMenuItem>
                                    )}
                                    {profile.userId ===
                                        currentPost.user.userId && (
                                        <DropdownMenuItem
                                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                            onClick={() => {
                                                setPostToEdit(currentPost);
                                                setIsEditModalOpen(true);
                                            }}
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {((membership &&
                                        hasCommunityPermission(
                                            membership,
                                            Constants.MembershipRole.MODERATE,
                                        )) ||
                                        currentPost.user.userId ===
                                            profile.userId) && (
                                        <DropdownMenuItem
                                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                            onClick={() =>
                                                handleDeletePost(currentPost)
                                            }
                                        >
                                            <Trash className="h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div>
                            <p className="mb-4 text-base font-semibold">
                                {currentPost.title}
                            </p>
                            <div className="mb-4 text-sm">
                                <TextRenderer
                                    json={currentPost.content}
                                    theme={theme.theme}
                                />
                            </div>
                        </div>
                        {currentPost.media && (
                            <div className="flex gap-2 overflow-x-auto">
                                {currentPost.media.map((media, index) => (
                                    <div
                                        className="flex-shrink-0"
                                        key={
                                            media.media?.mediaId ||
                                            media.url ||
                                            `${media.type}:${media.title || "untitled"}:${index}`
                                        }
                                    >
                                        <CommunityPostMediaPreview
                                            media={media}
                                            renderActualFile
                                            onRequestFullscreen={
                                                setFullscreenMedia
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`text-muted-foreground ${currentPost.hasLiked ? "bg-accent" : ""}`}
                                onClick={() => handleLike(currentPost.postId)}
                            >
                                <ThumbsUp className="mr-2 h-4 w-4" />
                                {currentPost.likesCount}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {currentPost.commentsCount}
                            </Button>
                        </div>
                        {membership && (
                            <CommentSection
                                membership={membership}
                                postId={currentPost.postId}
                                communityId={communityId}
                                onPostUpdated={(
                                    targetPostId: string,
                                    count: number,
                                ) => {
                                    setPost((prev) =>
                                        prev && prev.postId === targetPostId
                                            ? {
                                                  ...prev,
                                                  commentsCount: count,
                                              }
                                            : prev,
                                    );
                                }}
                            />
                        )}
                    </div>

                    <Dialog
                        open={showDeleteConfirmation}
                        onOpenChange={setShowDeleteConfirmation}
                    >
                        <DialogContent>
                            <DialogTitle>Delete Post</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this post?
                            </DialogDescription>
                            <DialogFooter>
                                <Button
                                    variant="outline"
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
                                    variant="outline"
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
                        categories={community?.categories || []}
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
                    <Dialog
                        open={!!fullscreenMedia}
                        onOpenChange={(open) => {
                            if (!open) {
                                setFullscreenMedia(null);
                            }
                        }}
                    >
                        <DialogContent className="h-[90vh] w-[92vw] max-w-[92vw] overflow-hidden p-4 sm:p-6">
                            {fullscreenMedia && (
                                <div className="h-full w-full overflow-hidden rounded-md">
                                    <CommunityPostMediaPreview
                                        media={fullscreenMedia}
                                        renderActualFile
                                    />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="lg:col-start-3 lg:row-start-1">
                    {community && (
                        <CommunityInfo
                            id={community.communityId}
                            name={community.name}
                            description={community.description}
                            image={
                                community.featuredImage?.file ||
                                "/courselit_backdrop_square.webp"
                            }
                            memberCount={community.membersCount}
                            membership={membership}
                            paymentPlan={community.paymentPlans?.find(
                                (plan) =>
                                    plan.planId ===
                                    community.defaultPaymentPlan,
                            )}
                            joiningReasonText={community.joiningReasonText}
                            pageId={community.pageId}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
