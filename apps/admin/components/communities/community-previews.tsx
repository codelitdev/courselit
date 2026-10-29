"use client";

import { Heart, Home, Megaphone, MessagesSquare, Package, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Community,
  CommunityPostContent,
  communityPlainText,
  initials,
  type Post,
  relativeDay,
  type StorefrontPlan,
} from "./community-shared";

function money(amountMajor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: amountMajor % 1 === 0 ? 0 : 2,
  }).format(amountMajor);
}

/** Price, its unit and a one-line summary, as learners see a plan on the sales page. */
export function planSummary(plan: StorefrontPlan, currency: string) {
  const amount = plan.amountMinor / 100;
  switch (plan.kind) {
    case "free":
      return { price: "Free", unit: "", detail: plan.description || "No payment needed" };
    case "one_time":
      return {
        price: money(plan.oneTimeAmount ?? amount, currency),
        unit: "one time",
        detail: plan.description || "Pay once, keep access",
      };
    case "installment": {
      const count = plan.emiTotalInstallments ?? plan.installmentCount ?? 0;
      return {
        price: money(plan.emiAmount ?? amount, currency),
        unit: `× ${count}`,
        detail: plan.description || `${count} monthly payments`,
      };
    }
    default: {
      const yearly = plan.billingInterval === "year";
      const value = yearly
        ? (plan.subscriptionYearlyAmount ?? amount)
        : (plan.subscriptionMonthlyAmount ?? amount);
      return {
        price: money(value, currency),
        unit: yearly ? "per year" : "per month",
        detail: plan.description || "Cancel any time",
      };
    }
  }
}

/** Plans in the order learners see them: the starred plan first. */
export function orderedPlans(plans: StorefrontPlan[]) {
  return plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export function joinCaption(
  plan: StorefrontPlan | undefined,
  currency: string,
  autoAcceptMembers: boolean,
) {
  if (!plan) return "Join";
  if (plan.kind === "free") return autoAcceptMembers ? "Join for free" : "Request to join";
  const { price, unit } = planSummary(plan, currency);
  if (plan.kind === "subscription") {
    return `Join for ${price} a ${unit === "per year" ? "year" : "month"}`;
  }
  return `Join for ${price}`;
}

export function BrowserFrame({
  address,
  children,
  className,
}: {
  address: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-md",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b bg-muted/50 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {address}
        </span>
      </div>
      {children}
    </div>
  );
}

function SchoolMark() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-primary"
      aria-hidden="true"
    >
      <MessagesSquare className="size-3.5" />
    </span>
  );
}

/** Small preview of the community block learners see on the /join sales page. */
export function SalesPagePreview({
  schoolName,
  address,
  communityName,
  plans,
  currency,
  autoAcceptMembers,
}: {
  schoolName: string;
  address: string;
  communityName: string;
  plans: StorefrontPlan[];
  currency: string;
  autoAcceptMembers: boolean;
}) {
  const visiblePlans = orderedPlans(plans);
  const selected = visiblePlans[0];
  const freeNeedsApproval = selected?.kind === "free" && !autoAcceptMembers;

  return (
    <BrowserFrame address={address}>
      <div className="flex items-center gap-4 border-b px-4 py-2.5 text-xs">
        <span className="flex items-center gap-2 text-sm font-medium">
          <SchoolMark />
          {schoolName}
        </span>
        <span className="text-muted-foreground">Products</span>
        <span className="text-muted-foreground">Blog</span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs font-medium text-primary">Community</p>
        <p className="text-xl font-semibold tracking-tight">
          {communityName.trim() || "Your community"}
        </p>
        {visiblePlans.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Your plans will show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {visiblePlans.map((plan, index) => {
              const summary = planSummary(plan, currency);
              const active = index === 0;
              return (
                <li
                  key={plan.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    active && "border-primary ring-2 ring-[var(--primary-soft)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      active && "border-primary",
                    )}
                    aria-hidden="true"
                  >
                    {active ? <span className="size-2 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{plan.name}</span>
                      {plan.isDefault && visiblePlans.length > 1 ? (
                        <span className="rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Recommended
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {summary.detail}
                    </span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block text-sm font-medium">{summary.price}</span>
                    {summary.unit ? (
                      <span className="text-muted-foreground">{summary.unit}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
          {joinCaption(selected, currency, autoAcceptMembers)}
        </div>
        {freeNeedsApproval ? (
          <p className="text-center text-xs text-muted-foreground">
            The team reviews each request before letting people in.
          </p>
        ) : null}
      </div>
    </BrowserFrame>
  );
}

const SAMPLE_POSTS: Post[] = [
  {
    id: "sample-1",
    author: { id: "a", kind: "learner", name: "Priya", email: null, imageUrl: null },
    authorKind: "learner",
    title: "Finished my first project",
    content: "Took me three weeks, but the case study is up. Feedback welcome.",
    category: "General",
    pinned: false,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Preview of the community Home, where members land after joining. It shows the
 * welcome banner as typed and the latest posts, or a sample post when there are none.
 */
export function CommunityHomePreview({
  schoolName,
  address,
  community,
  banner,
  posts,
  device,
}: {
  schoolName: string;
  address: string;
  community: Pick<Community, "name" | "categories">;
  banner: string;
  posts: Post[];
  device: "desktop" | "mobile";
}) {
  const shownPosts = (posts.length > 0 ? posts : SAMPLE_POSTS).slice(0, 2);
  const bannerText = communityPlainText(banner);
  const mobile = device === "mobile";

  return (
    <BrowserFrame
      address={address}
      className={cn("mx-auto transition-all", mobile ? "max-w-[380px]" : "w-full")}
    >
      <div className="flex min-h-[440px] bg-muted/20">
        {mobile ? null : (
          <aside className="w-44 shrink-0 space-y-1 border-r bg-card p-3 text-sm">
            <div className="mb-3 flex items-center gap-2">
              <SchoolMark />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{schoolName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {community.name || "Your community"}
                </span>
              </span>
            </div>
            <span className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 font-medium">
              <Home className="size-3.5" /> Home
            </span>
            <span className="flex items-center gap-2 px-2 py-1.5">
              <Package className="size-3.5" /> Products
            </span>
            <p className="px-2 pt-3 text-xs text-muted-foreground">Spaces</p>
            {(community.categories.length > 0 ? community.categories : ["General"])
              .slice(0, 4)
              .map((category) => (
                <span key={category} className="flex items-center gap-2 px-2 py-1.5">
                  <MessagesSquare className="size-3.5" /> {category}
                </span>
              ))}
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <div className="border-b bg-card px-4 py-2.5 text-sm font-medium">Feed</div>
          <div className="space-y-3 p-4">
            {bannerText ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-[var(--primary-soft)] px-3 py-2.5 text-xs">
                <Megaphone className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="line-clamp-3 whitespace-pre-line">{bannerText}</span>
              </div>
            ) : null}
            <div className="rounded-lg border bg-card px-3 py-2.5 text-xs text-muted-foreground">
              Write something…
            </div>
            {shownPosts.map((post) => (
              <article key={post.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-[10px] font-medium">
                    {initials(post.author?.name)}
                  </span>
                  <span className="text-xs">
                    <span className="block font-medium">
                      {post.author?.name ?? "Learner"}
                    </span>
                    <span className="text-muted-foreground">
                      {relativeDay(post.createdAt)} · {post.category}
                    </span>
                  </span>
                </div>
                <p className="mt-2 font-semibold">{post.title}</p>
                <div className="line-clamp-2 text-muted-foreground">
                  <CommunityPostContent value={post.content} className="text-xs" />
                </div>
                <div className="mt-2 flex gap-2 border-t pt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                    <Heart className="size-3" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                    <Reply className="size-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
