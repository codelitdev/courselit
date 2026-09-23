"use client";

import type { MediaRef } from "@courselit/api-contract";
import { PlatformTabNav } from "@courselit/components-library";
import {
  type Editor,
  type TextEditorContent,
  TextRenderer,
} from "@frontlit/text-editor";
import {
  CircleDashed,
  FileText,
  Film,
  Flag,
  Pin,
  Plus,
  Settings,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { FeaturedCard } from "@/components/featured-card";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { PermissionMessage } from "@/components/permission-message";
import { PaymentPlanList } from "@/components/products/payment-plan-list";
import type { SalesPage, StorefrontPlan } from "@/components/products/product-types";
import { RichTextEditor } from "@/components/products/rich-text-editor";
import { Resources } from "@/components/resources";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Switch } from "@/components/ui/codelit/switch";
import { Textarea } from "@/components/ui/codelit/textarea";
import { storefrontUrl } from "@/lib/storefront-url";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { CommunityFeaturedImage } from "./community-featured-image";

type School = {
  id: string;
  name: string;
  subdomain?: string;
  currency: string;
  permissions?: readonly string[];
  selected?: boolean;
};
type CommunityActor = {
  id: string;
  kind: "learner" | "admin";
  name: string;
  email: string | null;
  imageUrl: string | null;
};

function communityEditorContent(
  value: string,
): ComponentProps<typeof Editor>["initialContent"] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Communities created before rich-text support contain plain text.
  }
  return value;
}

function communityRichTextContent(value: string): TextEditorContent | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: unknown }).type === "doc" &&
      Array.isArray((parsed as { content?: unknown }).content)
    ) {
      return parsed as TextEditorContent;
    }
  } catch {
    // Communities created before rich-text support contain plain text.
  }
  return null;
}

const CommunityDescription = CommunityPostContent;
function CommunityPostContent({ value }: { value: string }) {
  const richText = communityRichTextContent(value);
  return richText ? (
    <TextRenderer json={richText} className="text-sm leading-6 text-muted-foreground" />
  ) : (
    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
      {value}
    </p>
  );
}

type Community = {
  id: string;
  schoolId: string;
  name: string;
  slug: string;
  description: string;
  banner: string;
  categories: string[];
  autoAcceptMembers: boolean;
  joiningReasonText: string;
  featuredImage: MediaRef | null;
  membersCount: number;
  postsCount: number;
  membership: Membership | null;
  createdAt: string;
  updatedAt: string;
  salesPage?: SalesPage | null;
};
type Membership = {
  id: string;
  communityId: string;
  learnerId: string | null;
  adminUserId: string | null;
  member: CommunityActor | null;
  status: "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused";
  role: "member" | "moderator" | "owner";
  joiningReason: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};
type Post = {
  id: string;
  communityId: string;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  author: CommunityActor | null;
  title: string;
  content: string;
  category: string;
  media: CommunityMedia[];
  pinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type CommunityMedia = {
  id: string;
  type: "image" | "video" | "pdf";
  title: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
};
type CommunityReportContent = {
  id: string;
  content: string;
  media: CommunityMedia[];
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  author: CommunityActor | null;
};
type Report = {
  id: string;
  communityId: string;
  contentType: "post" | "comment" | "reply";
  contentId: string;
  contentParentId: string | null;
  reporterId: string | null;
  reporterKind: "learner" | "admin" | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: CommunityReportContent | null;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityAdminView = "list" | "new" | "detail" | "manage";
export type CommunityManageSection = "settings" | "memberships" | "plans" | "reports";

type ApiError = {
  message?: string;
  details?: {
    reason?: string;
  };
};

const COMMUNITY_PAGE_SIZE = 10;

function communityPagePath(
  path: string,
  cursor?: string | null,
  extra?: Record<string, string | undefined>,
) {
  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ limit: String(COMMUNITY_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return `${path}${separator}${params.toString()}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function communityApiErrorMessage(error: ApiError | null, fallback: string) {
  if (error?.details?.reason === "community_requires_default_payment_plan") {
    return "Add an active default payment plan before enabling this community for learners.";
  }
  return error?.message ?? fallback;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <PageHeader title={title} description={description} />
    </div>
  );
}


function CommunityMediaPreview({ items }: { items: CommunityMedia[] }) {
  if (items.length === 0) return null;

  return (
    <ul
      className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2"
      aria-label="Post media"
    >
      {items.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-md border bg-muted/20">
          {item.type === "image" ? (
            <a href={item.url} target="_blank" rel="noreferrer">
              <Image
                src={item.thumbnailUrl ?? item.url}
                alt={item.title || item.fileName}
                width={640}
                height={360}
                unoptimized
                className="aspect-video w-full object-cover hover:opacity-90"
              />
            </a>
          ) : item.type === "video" ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-video bg-muted hover:opacity-90"
            >
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title || item.fileName}
                  width={640}
                  height={360}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Film className="size-5" /> Open video
                </span>
              )}
            </a>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-20 items-center gap-3 p-3 text-sm hover:bg-muted/40"
            >
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{item.fileName}</span>
            </a>
          )}
          <p className="truncate border-t px-3 py-2 text-xs text-muted-foreground">
            {item.title || item.fileName}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CommunityAdmin({
  view,
  manageSection = "settings",
}: {
  view: CommunityAdminView;
  manageSection?: CommunityManageSection;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [communityId, setCommunityId] = useState<string | undefined>();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesNextCursor, setCommunitiesNextCursor] = useState<string | null>(
    null,
  );
  const [loadingMoreCommunities, setLoadingMoreCommunities] = useState(false);
  const [members, setMembers] = useState<Membership[]>([]);
  const [membersStatusFilter, setMembersStatusFilter] = useState<
    Membership["status"] | "all"
  >("all");
  const [membersNextCursor, setMembersNextCursor] = useState<string | null>(null);
  const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsStatusFilter, setReportsStatusFilter] = useState<
    Report["status"] | "all"
  >("all");
  const [reportsNextCursor, setReportsNextCursor] = useState<string | null>(null);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [plans, setPlans] = useState<StorefrontPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const breadcrumbItems = useMemo(() => {
    if (view === "detail" || view === "list") {
      return [{ label: "Community" }];
    }
    if (view === "manage" && manageSection && manageSection !== "settings") {
      const sectionLabel =
        manageSection === "memberships"
          ? "Members"
          : manageSection === "plans"
            ? "Payment plans"
            : "Moderation";
      return [{ label: "Community", href: "/community" }, { label: sectionLabel }];
    }
    return [{ label: "Community", href: "/community" }];
  }, [view, manageSection]);

  useSetBreadcrumb(breadcrumbItems);

  const canWriteCommunities = hasSchoolPermission(school, "communities:write");

  const request = useCallback(
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
      if (!school) throw new Error("Select a school before managing communities.");
      const headers = new Headers(init.headers);
      headers.set("x-school-id", school.id);
      if (init.body && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        credentials: "include",
        headers,
      });
      const body = (await response.json().catch(() => null)) as (T & ApiError) | null;
      if (!response.ok) {
        throw new Error(
          communityApiErrorMessage(body, "The request could not be completed."),
        );
      }
      return body as T;
    },
    [school],
  );

  async function shareCommunity() {
    if (!community || !school) return;
    const url = storefrontUrl(
      `/p/${encodeURIComponent(community.slug)}`,
      school.subdomain,
    );
    if (!url) {
      setError("Unable to build the public community URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setNotice("Community URL copied to clipboard.");
    } catch {
      setError("Unable to copy the community URL.");
    }
  }

  const loadCommunity = useCallback(async () => {
    if (!communityId) return;
    const [body, salesPage] = await Promise.all([
      request<Community>(`/api/v1/communities/${encodeURIComponent(communityId)}`),
      request<SalesPage>(
        `/api/v1/sales-pages/community/${encodeURIComponent(communityId)}`,
      ).catch(() => null),
    ]);
    setCommunity({ ...body, salesPage });
  }, [communityId, request]);

  const loadPosts = useCallback(
    async (cursor?: string | null) => {
      if (!communityId) return;
      const body = await request<{ items?: Post[]; nextCursor?: string | null }>(
        communityPagePath(
          `/api/v1/communities/${encodeURIComponent(communityId)}/posts`,
          cursor,
        ),
      );
      setPosts((items) =>
        cursor ? [...items, ...(body.items ?? [])] : (body.items ?? []),
      );
      setPostsNextCursor(body.nextCursor ?? null);
    },
    [communityId, request],
  );

  const loadManageData = useCallback(async () => {
    if (!communityId) return;
    const [memberBody, reportBody, planBody] = await Promise.all([
      request<{ items?: Membership[]; nextCursor?: string | null }>(
        communityPagePath(
          `/api/v1/communities/${encodeURIComponent(communityId)}/members`,
          null,
          {
            status: membersStatusFilter === "all" ? undefined : membersStatusFilter,
          },
        ),
      ),
      request<{ items?: Report[]; nextCursor?: string | null }>(
        communityPagePath(
          `/api/v1/communities/${encodeURIComponent(communityId)}/reports`,
          null,
          {
            status: reportsStatusFilter === "all" ? undefined : reportsStatusFilter,
          },
        ),
      ),
      request<{ items?: StorefrontPlan[] }>(
        `/api/v1/communities/${encodeURIComponent(communityId)}/plans`,
      ),
    ]);
    setMembers(memberBody.items ?? []);
    setMembersNextCursor(memberBody.nextCursor ?? null);
    setReports(reportBody.items ?? []);
    setReportsNextCursor(reportBody.nextCursor ?? null);
    setPlans(planBody.items ?? []);
  }, [communityId, membersStatusFilter, reportsStatusFilter, request]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) {
          if (view === "list") {
            if (active) {
              setSchool(null);
              setCommunities([]);
            }
            return null;
          }
          throw new Error("Create a school before managing communities.");
        }
        if (active) setSchool(selected);
        return selected;
      })
      .then(async (selected) => {
        if (!selected) return;
        const headers = { "x-school-id": selected.id };
        if (view === "new") return;
        const detailResponse = await fetch("/api/v1/community", {
          credentials: "include",
          cache: "no-store",
          headers,
        });
        if (!detailResponse.ok) {
          throw new Error("Unable to load the community.");
        }
        const detail = (await detailResponse.json()) as Community;
        const resolvedId = detail.id;
        if (active) setCommunityId(resolvedId);
        const salesPageResponse = await fetch(
          `/api/v1/sales-pages/community/${encodeURIComponent(resolvedId)}`,
          { credentials: "include", cache: "no-store", headers },
        );
        const salesPage = salesPageResponse.ok
          ? ((await salesPageResponse.json()) as SalesPage)
          : null;
        if (active) setCommunity({ ...detail, salesPage });
        if (view === "detail" || view === "list") {
          const postResponse = await fetch(
            communityPagePath(
              `/api/v1/communities/${encodeURIComponent(resolvedId)}/posts`,
            ),
            { credentials: "include", cache: "no-store", headers },
          );
          if (!postResponse.ok) throw new Error("Unable to load community posts.");
          const postBody = (await postResponse.json()) as {
            items?: Post[];
            nextCursor?: string | null;
          };
          if (active) {
            setPosts(postBody.items ?? []);
            setPostsNextCursor(postBody.nextCursor ?? null);
          }
        } else {
          const [memberResponse, reportResponse, planResponse] = await Promise.all([
            fetch(
              communityPagePath(
                `/api/v1/communities/${encodeURIComponent(resolvedId)}/members`,
                null,
                {
                  status:
                    membersStatusFilter === "all" ? undefined : membersStatusFilter,
                },
              ),
              {
                credentials: "include",
                cache: "no-store",
                headers,
              },
            ),
            fetch(
              communityPagePath(
                `/api/v1/communities/${encodeURIComponent(resolvedId)}/reports`,
                null,
                {
                  status:
                    reportsStatusFilter === "all" ? undefined : reportsStatusFilter,
                },
              ),
              { credentials: "include", cache: "no-store", headers },
            ),
            fetch(`/api/v1/communities/${encodeURIComponent(resolvedId)}/plans`, {
              credentials: "include",
              cache: "no-store",
              headers,
            }),
          ]);
          if (!memberResponse.ok || !reportResponse.ok || !planResponse.ok) {
            throw new Error("Unable to load community moderation data.");
          }
          const memberBody = (await memberResponse.json()) as {
            items?: Membership[];
            nextCursor?: string | null;
          };
          const reportBody = (await reportResponse.json()) as {
            items?: Report[];
            nextCursor?: string | null;
          };
          const planBody = (await planResponse.json()) as { items?: StorefrontPlan[] };
          if (active) {
            setMembers(memberBody.items ?? []);
            setMembersNextCursor(memberBody.nextCursor ?? null);
            setReports(reportBody.items ?? []);
            setReportsNextCursor(reportBody.nextCursor ?? null);
            setPlans(planBody.items ?? []);
          }
        }
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "Unable to load communities."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [membersStatusFilter, reportsStatusFilter, view]);

  async function reloadCurrent() {
    if (view === "detail") {
      await Promise.all([loadCommunity(), loadPosts()]);
    } else {
      await loadCommunity();
      await loadManageData();
    }
  }

  async function loadMoreCommunities() {
    if (!communitiesNextCursor || loadingMoreCommunities) return;
    setLoadingMoreCommunities(true);
    setError(null);
    try {
      const body = await request<{
        items?: Community[];
        nextCursor?: string | null;
      }>(communityPagePath("/api/v1/communities", communitiesNextCursor));
      setCommunities((items) => [...items, ...(body.items ?? [])]);
      setCommunitiesNextCursor(body.nextCursor ?? null);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more communities."));
    } finally {
      setLoadingMoreCommunities(false);
    }
  }

  async function loadMorePosts() {
    if (!postsNextCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    setError(null);
    try {
      await loadPosts(postsNextCursor);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more community posts."));
    } finally {
      setLoadingMorePosts(false);
    }
  }

  async function loadMoreMembers() {
    if (!membersNextCursor || loadingMoreMembers || !communityId) return;
    setLoadingMoreMembers(true);
    setError(null);
    try {
      const body = await request<{
        items?: Membership[];
        nextCursor?: string | null;
      }>(
        communityPagePath(
          `/api/v1/communities/${encodeURIComponent(communityId)}/members`,
          membersNextCursor,
          {
            status: membersStatusFilter === "all" ? undefined : membersStatusFilter,
          },
        ),
      );
      setMembers((items) => [...items, ...(body.items ?? [])]);
      setMembersNextCursor(body.nextCursor ?? null);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more memberships."));
    } finally {
      setLoadingMoreMembers(false);
    }
  }

  async function loadMoreReports() {
    if (!reportsNextCursor || loadingMoreReports || !communityId) return;
    setLoadingMoreReports(true);
    setError(null);
    try {
      const body = await request<{
        items?: Report[];
        nextCursor?: string | null;
      }>(
        communityPagePath(
          `/api/v1/communities/${encodeURIComponent(communityId)}/reports`,
          reportsNextCursor,
          {
            status: reportsStatusFilter === "all" ? undefined : reportsStatusFilter,
          },
        ),
      );
      setReports((items) => [...items, ...(body.items ?? [])]);
      setReportsNextCursor(body.nextCursor ?? null);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more reports."));
    } finally {
      setLoadingMoreReports(false);
    }
  }

  async function togglePostPin(post: Post) {
    try {
      const updated = await request<Post>(`/api/v1/community-posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pinned: !post.pinned }),
      });
      setPosts((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(updated.pinned ? "Post pinned." : "Post unpinned.");
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update the pinned state."));
    }
  }

  return (
    <AuthGate>
      <main className="page-shell">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-md bg-[var(--primary-soft)] px-3 py-2 text-sm text-primary"
          >
            {notice}
          </p>
        ) : null}
        {loading ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            <CourseLitLoading />
          </div>
        ) : view === "list" ? (
          <CommunityList
            communities={communities}
            canCreate={canWriteCommunities}
            hasMore={Boolean(communitiesNextCursor)}
            loadingMore={loadingMoreCommunities}
            onLoadMore={() => void loadMoreCommunities()}
          />
        ) : view === "new" ? (
          school ? (
            canWriteCommunities ? (
              <NewCommunity
                request={request}
                school={school}
                saving={saving}
                setSaving={setSaving}
                setError={setError}
                router={router}
              />
            ) : (
              <PermissionMessage permission="communities:write" />
            )
          ) : null
        ) : community && school ? (
          view === "detail" ? (
            <CommunityOverview
              community={community}
              posts={posts}
              onShare={() => void shareCommunity()}
              onTogglePin={togglePostPin}
              canManage={canWriteCommunities}
              canEditWebsite={hasSchoolPermission(school, "storefront:write")}
              canModerate={hasSchoolPermission(school, "communities:moderate")}
              onLoadMore={loadMorePosts}
              loadingMore={loadingMorePosts}
              hasMore={Boolean(postsNextCursor)}
            />
          ) : canWriteCommunities ? (
            <CommunityManage
              community={community}
              school={school}
              section={manageSection}
              members={members}
              membersStatusFilter={membersStatusFilter}
              setMembersStatusFilter={setMembersStatusFilter}
              reports={reports}
              reportsStatusFilter={reportsStatusFilter}
              setReportsStatusFilter={setReportsStatusFilter}
              plans={plans}
              request={request}
              onRefresh={reloadCurrent}
              setCommunity={setCommunity}
              setMembers={setMembers}
              membersNextCursor={membersNextCursor}
              loadingMoreMembers={loadingMoreMembers}
              onLoadMoreMembers={loadMoreMembers}
              setReports={setReports}
              reportsNextCursor={reportsNextCursor}
              loadingMoreReports={loadingMoreReports}
              onLoadMoreReports={loadMoreReports}
              setPlans={setPlans}
              saving={saving}
              setSaving={setSaving}
              setError={setError}
              setNotice={setNotice}
              router={router}
            />
          ) : (
            <PermissionMessage permission="communities:write" />
          )
        ) : null}
      </main>
    </AuthGate>
  );
}

function CommunityOverview({
  community,
  posts,
  onShare,
  onTogglePin,
  canManage,
  canEditWebsite,
  canModerate,
  onLoadMore,
  loadingMore,
  hasMore,
}: {
  community: Community;
  posts: Post[];
  onShare: () => void;
  onTogglePin: (post: Post) => void;
  canManage: boolean;
  canEditWebsite: boolean;
  canModerate: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <SectionHeading title={community.name} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Share community"
            title="Share community"
            onClick={onShare}
          >
            <Share2 className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {community.salesPage?.pageId && canEditWebsite ? (
            <Button asChild variant="outline">
              <Link
                href={`/pages/${encodeURIComponent(community.salesPage.pageId)}/edit?redirectTo=${encodeURIComponent(`/community`)}&resourceType=community&resourceId=${encodeURIComponent(community.id)}`}
              >
                Edit page
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button asChild>
              <Link href="/community">
                <Settings className="size-4" />
                Manage community
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {community.featuredImage ? (
        <Image
          src={community.featuredImage.thumbnailUrl ?? community.featuredImage.url}
          alt={community.featuredImage.alt || community.name}
          width={1280}
          height={480}
          unoptimized
          className="max-h-72 w-full rounded-xl border object-cover"
        />
      ) : null}
      <p className="text-sm text-muted-foreground">
        Discussion areas are managed as{" "}
        <Link href="/spaces" className="underline underline-offset-2">
          Spaces
        </Link>
        .
      </p>
      <section className="grid gap-4 md:grid-cols-4" aria-label="Community overview">
        <div className="card">
          <p className="text-sm text-muted-foreground">Active members</p>
          <p className="mt-2 text-2xl font-semibold">
            {community.membersCount.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted-foreground">Recent posts</p>
          <p className="mt-2 text-2xl font-semibold">
            {community.postsCount.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted-foreground">Member access</p>
          <p className="mt-2 text-2xl font-semibold">
            {community.autoAcceptMembers ? "Automatic" : "Approval required"}
          </p>
        </div>
      </section>
      {canManage || canModerate ? (
        <section className="card stack">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Admin controls</h2>
              <p className="text-sm text-muted-foreground">
                Configure access, memberships, payment plans, and moderation from the
                management area.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/community/memberships">
                      <Users className="size-4" /> Members
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/community/plans">
                      <CircleDashed className="size-4" /> Payment plans
                    </Link>
                  </Button>
                </>
              ) : null}
              {canModerate ? (
                <Button asChild variant="outline">
                  <Link href="/community/reports">
                    <Flag className="size-4" /> Moderation
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      <section className="space-y-4" aria-label="Recent community activity">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <span className="text-sm text-muted-foreground">Read-only admin view</span>
        </div>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No learner discussions yet.
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  {post.pinned ? <span className="text-primary">Pinned</span> : null}
                  {post.pinned ? <span>·</span> : null}
                  <span>
                    {post.author?.name ??
                      (post.authorKind === "admin" ? "Admin" : "Learner")}
                  </span>
                  <span>·</span>
                  <span>{displayDate(post.createdAt)}</span>
                </div>
                {canModerate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={post.pinned ? "secondary" : "ghost"}
                    onClick={() => onTogglePin(post)}
                  >
                    <Pin className="size-3.5" />
                    {post.pinned ? "Unpin" : "Pin"}
                  </Button>
                ) : null}
              </div>
              <h3 className="mt-2 font-semibold">{post.title}</h3>
              <div className="mt-2 text-sm text-muted-foreground">
                <CommunityPostContent value={post.content} />
              </div>
              <CommunityMediaPreview items={post.media} />
            </article>
          ))
        )}
        {hasMore ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMore}
              disabled={loadingMore}
              aria-label={loadingMore ? "Loading posts" : "Load more posts"}
            >
              {loadingMore ? (
                <CourseLitLoadingIcon size={14} />
              ) : (
                "Load more posts"
              )}
            </Button>
          </div>
        ) : null}
      </section>
    </>
  );
}

function CommunityList({
  communities,
  canCreate,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  communities: Community[];
  canCreate: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <>
      <PageHeader
        title="Community"
        description="Configure your school community, plans, and members."
      />
      {communities.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Community unavailable"
          description="The school community could not be loaded."
        />
      ) : (
        <section
          className="grid gap-x-4 gap-y-3 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Communities"
        >
          {communities.map((item) => (
            <FeaturedCard
              key={item.id}
              href="/community"
              title={item.name}
              imageUrl={item.featuredImage?.thumbnailUrl ?? item.featuredImage?.url}
              imageAlt={item.featuredImage?.alt || item.name}
            >
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {item.categories.length}{" "}
                  {item.categories.length === 1 ? "category" : "categories"}
                </span>
                <span>{item.membersCount.toLocaleString()} members</span>
              </div>
            </FeaturedCard>
          ))}
        </section>
      )}
      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={loadingMore}
            aria-label={loadingMore ? "Loading communities" : "Load more communities"}
          >
              {loadingMore ? (
                <CourseLitLoadingIcon size={14} />
              ) : (
                "Load more communities"
              )}
          </Button>
        </div>
      ) : null}
      {canCreate ? (
        <Resources
          links={[
            {
              href: "https://docs.courselit.app/communities/introduction/",
              text: "Create a community",
            },
          ]}
        />
      ) : null}
    </>
  );
}

function NewCommunity({
  request,
  school,
  saving,
  setSaving,
  setError,
  router,
}: {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  school: School;
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("General");
  const [autoAcceptMembers, setAutoAcceptMembers] = useState(true);
  const [joiningReasonText, setJoiningReasonText] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = await request<Community>("/api/v1/communities", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description,
          categories: categories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          autoAcceptMembers,
          joiningReasonText,
        }),
      });
      router.replace("/community");
    } catch (caught) {
      setError(errorMessage(caught, "Unable to create the community."));
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Communities"
        title="Community"
        description="Create a community, then configure its members and discussions."
      />
      <form onSubmit={create} className="card stack">
        <div className="field">
          <label htmlFor="community-name">Name</label>
          <Input
            id="community-name"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Course creators"
          />
        </div>
        <div className="field">
          <span className="font-medium">Description</span>
          <RichTextEditor
            school={school}
            purpose="community_content"
            initialContent={communityEditorContent(description)}
            onChange={(document) => setDescription(JSON.stringify(document))}
            showToolbar={false}
            placeholder="What is this community about?"
            className="rounded-md border bg-card"
            editorClassName="min-h-[160px]"
          />
        </div>
        <div className="field">
          <label htmlFor="community-categories">Categories</label>
          <Input
            id="community-categories"
            value={categories}
            onChange={(event) => setCategories(event.target.value)}
            placeholder="General, Questions"
          />
          <span className="text-xs text-muted-foreground">
            Separate categories with commas.
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="community-auto-accept-members" className="text-sm">
            Automatically accept new members
          </label>
          <Switch
            id="community-auto-accept-members"
            checked={autoAcceptMembers}
            onCheckedChange={setAutoAcceptMembers}
          />
        </div>
        {!autoAcceptMembers ? (
          <div className="field">
            <label htmlFor="community-joining-question">Screening question</label>
            <Textarea
              id="community-joining-question"
              maxLength={500}
              value={joiningReasonText}
              onChange={(event) => setJoiningReasonText(event.target.value)}
              placeholder="Why would you like to join?"
            />
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? "Creating…" : "Create community"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/communities">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function CommunityManage({
  community,
  school,
  section,
  members,
  membersStatusFilter,
  setMembersStatusFilter,
  reports,
  reportsStatusFilter,
  setReportsStatusFilter,
  plans,
  request,
  onRefresh,
  setCommunity,
  setMembers,
  membersNextCursor,
  loadingMoreMembers,
  onLoadMoreMembers,
  setReports,
  reportsNextCursor,
  loadingMoreReports,
  onLoadMoreReports,
  setPlans,
  saving,
  setSaving,
  setError,
  setNotice,
  router,
}: {
  community: Community;
  school: School;
  section: CommunityManageSection;
  members: Membership[];
  membersStatusFilter: Membership["status"] | "all";
  setMembersStatusFilter: (value: Membership["status"] | "all") => void;
  reports: Report[];
  reportsStatusFilter: Report["status"] | "all";
  setReportsStatusFilter: (value: Report["status"] | "all") => void;
  plans: StorefrontPlan[];
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
  setCommunity: (value: Community) => void;
  setMembers: React.Dispatch<React.SetStateAction<Membership[]>>;
  membersNextCursor: string | null;
  loadingMoreMembers: boolean;
  onLoadMoreMembers: () => void;
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  reportsNextCursor: string | null;
  loadingMoreReports: boolean;
  onLoadMoreReports: () => void;
  setPlans: React.Dispatch<React.SetStateAction<StorefrontPlan[]>>;
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [name, setName] = useState(community.name);
  const [slug, setSlug] = useState(community.slug);
  const [description, setDescription] = useState(community.description);
  const [banner, setBanner] = useState(community.banner);
  const [autoAcceptMembers, setAutoAcceptMembers] = useState(
    community.autoAcceptMembers,
  );
  const [joiningReasonText, setJoiningReasonText] = useState(
    community.joiningReasonText,
  );
  const [memberToReject, setMemberToReject] = useState<Membership | null>(null);
  const [memberRejectionReason, setMemberRejectionReason] = useState("");
  const [reportToReject, setReportToReject] = useState<Report | null>(null);
  const [reportRejectionReason, setReportRejectionReason] = useState("");


  useEffect(() => {
    setName(community.name);
    setSlug(community.slug);
    setDescription(community.description);
    setBanner(community.banner);
    setAutoAcceptMembers(community.autoAcceptMembers);
    setJoiningReasonText(community.joiningReasonText);
  }, [community]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await request<Community>(`/api/v1/communities/${community.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description,
          banner,
          autoAcceptMembers,
          joiningReasonText,
        }),
      });
      setCommunity(updated);
      setNotice("Community settings saved.");
    } catch (caught) {
      setError(errorMessage(caught, "Unable to save community settings."));
    } finally {
      setSaving(false);
    }
  }

  async function changeFeaturedImage(selection: MediaRef | null) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await request<Community>(
        `/api/v1/communities/${encodeURIComponent(community.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ featuredImage: selection }),
        },
      );
      setCommunity(updated);
      setNotice(selection ? "Featured image saved." : "Featured image removed.");
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update the featured image."));
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(
    member: Membership,
    update: Partial<Pick<Membership, "status" | "role" | "rejectionReason">>,
  ) {
    try {
      const updated = await request<Membership>(
        `/api/v1/community-memberships/${member.id}`,
        { method: "PATCH", body: JSON.stringify(update) },
      );
      setMembers((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice("Membership updated.");
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update membership."));
    }
  }

  function requestMemberStatusChange(member: Membership, status: Membership["status"]) {
    if (status === "rejected") {
      setMemberToReject(member);
      setMemberRejectionReason(member.rejectionReason ?? "");
      return;
    }
    void updateMember(member, { status, rejectionReason: null });
  }

  async function rejectMember() {
    if (!memberToReject || !memberRejectionReason.trim()) return;
    await updateMember(memberToReject, {
      status: "rejected",
      rejectionReason: memberRejectionReason.trim(),
    });
    setMemberToReject(null);
    setMemberRejectionReason("");
  }

  async function updateReport(
    report: Report,
    status: Report["status"],
    rejectionReason: string | null = null,
  ): Promise<boolean> {
    try {
      const updated = await request<Report>(`/api/v1/community-reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });
      setReports((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(`Report ${status}.`);
      return true;
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update report."));
      return false;
    }
  }

  function requestReportStatusChange(report: Report, status: Report["status"]) {
    if (status === "rejected") {
      setReportToReject(report);
      setReportRejectionReason(report.rejectionReason ?? "");
      return;
    }
    void updateReport(report, status);
  }

  async function rejectReport() {
    if (!reportToReject || !reportRejectionReason.trim()) return;
    const updated = await updateReport(
      reportToReject,
      "rejected",
      reportRejectionReason.trim(),
    );
    if (!updated) return;
    setReportToReject(null);
    setReportRejectionReason("");
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionHeading
            title="Community settings"
            description="Manage the community, members, and reported content."
          />
        </div>
        <div className="flex items-center gap-2">
          {community.salesPage?.pageId ? (
            <Button asChild variant="outline">
              <Link
                href={`/pages/${encodeURIComponent(community.salesPage.pageId)}/edit?redirectTo=${encodeURIComponent(`/community`)}&resourceType=community&resourceId=${encodeURIComponent(community.id)}`}
              >
                Edit page
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <PlatformTabNav
        value={section}
        ariaLabel="Community management"
        items={[
          {
            value: "settings",
            label: "Settings",
            href: "/community",
            icon: <Settings className="size-4" />,
          },
          {
            value: "memberships",
            label: "Memberships",
            href: "/community/memberships",
            icon: <Users className="size-4" />,
          },
          {
            value: "plans",
            label: "Payment plans",
            href: "/community/plans",
            icon: <CircleDashed className="size-4" />,
          },
          {
            value: "reports",
            label: "Reports",
            href: "/community/reports",
            icon: <Flag className="size-4" />,
          },
        ]}
      />
      {section === "settings" ? (
        <form onSubmit={saveSettings} className="w-full space-y-5">
          <CommunityFeaturedImage
            school={school}
            value={community.featuredImage}
            disabled={saving}
            onChange={(value) => void changeFeaturedImage(value)}
          />
          <div className="field">
            <span className="font-medium">Description</span>
            <RichTextEditor
              school={school}
              purpose="community_content"
              initialContent={communityEditorContent(description)}
              refresh={Date.parse(community.updatedAt)}
              onChange={(document) => setDescription(JSON.stringify(document))}
              showToolbar={false}
              placeholder="Describe this community."
              className="rounded-md border bg-card"
              editorClassName="min-h-[160px]"
            />
          </div>
          <div className="field">
            <span className="font-medium">Banner</span>
            <p className="text-xs text-muted-foreground">
              Optional announcement shown to learners at the top of the community.
            </p>
            <RichTextEditor
              school={school}
              purpose="community_content"
              initialContent={communityEditorContent(banner)}
              refresh={Date.parse(community.updatedAt)}
              onChange={(document) => setBanner(JSON.stringify(document))}
              showToolbar={false}
              placeholder="Share an announcement with community members."
              className="rounded-md border bg-card"
              editorClassName="min-h-[120px]"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="manage-community-auto-accept" className="text-sm">
              Automatically accept new members
            </label>
            <Switch
              id="manage-community-auto-accept"
              checked={autoAcceptMembers}
              onCheckedChange={setAutoAcceptMembers}
            />
          </div>
          {!autoAcceptMembers ? (
            <div className="field">
              <label htmlFor="manage-community-joining-question">
                Screening question
              </label>
              <Input
                id="manage-community-joining-question"
                maxLength={500}
                value={joiningReasonText}
                onChange={(event) => setJoiningReasonText(event.target.value)}
                placeholder="Why do you want to join this community?"
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void onRefresh()}>
              Reset
            </Button>
          </div>
        </form>
      ) : null}
      {section === "memberships" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Memberships</h2>
              <p className="text-sm text-muted-foreground">
                Approve learners and assign community moderators.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={membersStatusFilter}
                onValueChange={(value) =>
                  setMembersStatusFilter(value as Membership["status"] | "all")
                }
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="payment_failed">Payment failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {members.length} members
              </span>
            </div>
          </div>
          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No members yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Rejection reason</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            {member.member?.imageUrl ? (
                              <AvatarImage
                                src={member.member.imageUrl}
                                alt={member.member.name}
                              />
                            ) : null}
                            <AvatarFallback>
                              {(member.member?.name ?? "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {member.member?.name ??
                                member.learnerId ??
                                member.adminUserId ??
                                "Unknown"}
                            </p>
                            {member.member?.email ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {member.member.email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={member.status}
                          onValueChange={(val) =>
                            requestMemberStatusChange(
                              member,
                              val as Membership["status"],
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="payment_failed" disabled>
                              Payment failed
                            </SelectItem>
                            <SelectItem value="expired" disabled>
                              Expired
                            </SelectItem>
                            <SelectItem value="paused" disabled>
                              Paused
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={member.role}
                          disabled={member.status !== "active"}
                          onValueChange={(val) =>
                            void updateMember(member, {
                              role: val as Membership["role"],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-muted-foreground">
                        {member.joiningReason || "—"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-muted-foreground">
                        {member.rejectionReason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {membersNextCursor ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMoreMembers}
                aria-label={loadingMoreMembers ? "Loading memberships" : "Load more memberships"}
                onClick={onLoadMoreMembers}
              >
                {loadingMoreMembers ? (
                  <CourseLitLoadingIcon size={14} />
                ) : (
                  "Load more memberships"
                )}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
      <Dialog
        open={Boolean(memberToReject)}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToReject(null);
            setMemberRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject membership request</DialogTitle>
            <DialogDescription>
              Provide a reason so the learner understands why their request was
              rejected.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={memberRejectionReason}
            onChange={(event) => setMemberRejectionReason(event.target.value)}
            placeholder="Reason for rejection"
            aria-label="Rejection reason"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMemberToReject(null);
                setMemberRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!memberRejectionReason.trim()}
              onClick={() => void rejectMember()}
            >
              Reject membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(reportToReject)}
        onOpenChange={(open) => {
          if (!open) {
            setReportToReject(null);
            setReportRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject report</DialogTitle>
            <DialogDescription>
              Provide a reason so the moderation decision is recorded for your team.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reportRejectionReason}
            onChange={(event) => setReportRejectionReason(event.target.value)}
            placeholder="Reason for rejecting this report"
            aria-label="Report rejection reason"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReportToReject(null);
                setReportRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!reportRejectionReason.trim()}
              onClick={() => void rejectReport()}
            >
              Reject report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {section === "plans" ? (
        <PaymentPlanList
          listPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
          createPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
          planPath={(planId) => `/api/v1/community-plans/${encodeURIComponent(planId)}`}
          defaultPath={(planId) =>
            `/api/v1/community-plans/${encodeURIComponent(planId)}/default`
          }
          archivePath={(planId) =>
            `/api/v1/community-plans/${encodeURIComponent(planId)}/archive`
          }
          school={school}
          plans={plans}
          request={request}
          onChanged={setPlans}
          title="Payment plans"
          description="Manage access plans for this community."
          entityLabel="community"
        />
      ) : null}
      {section === "reports" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Reported content</h2>
              <p className="text-sm text-muted-foreground">
                Review reports and remove content that violates your community rules.
              </p>
            </div>
            <Select
              value={reportsStatusFilter}
              onValueChange={(val) =>
                setReportsStatusFilter(val as Report["status"] | "all")
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reports</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No reports found.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Flag className="size-3.5" />
                        {report.contentType} · {displayDate(report.createdAt)} ·{" "}
                        {report.status}
                      </div>
                      <p className="mt-2 text-sm">{report.reason}</p>
                      {report.content ? (
                        <div className="mt-3 rounded-md bg-muted/30 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {report.content.author?.name ??
                                (report.authorKind === "admin" ? "Admin" : "Learner")}
                            </span>
                            <span>·</span>
                            <span>Reported {report.contentType}</span>
                          </div>
                          <div className="mt-2 text-sm">
                            <CommunityPostContent value={report.content.content} />
                          </div>
                          <CommunityMediaPreview items={report.content.media} />
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          The reported content is no longer available.
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Content: {report.contentId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {report.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              void requestReportStatusChange(report, "accepted")
                            }
                          >
                            Accept &amp; remove
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              requestReportStatusChange(report, "rejected")
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : report.status === "accepted" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => requestReportStatusChange(report, "rejected")}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void requestReportStatusChange(report, "pending")
                          }
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {reportsNextCursor ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMoreReports}
                aria-label={loadingMoreReports ? "Loading reports" : "Load more reports"}
                onClick={onLoadMoreReports}
              >
                {loadingMoreReports ? (
                  <CourseLitLoadingIcon size={14} />
                ) : (
                  "Load more reports"
                )}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
