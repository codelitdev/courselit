import type { MediaRef } from "@courselit/api-contract";

export type CourseLitPlan = {
  id: string;
  name: string;
  description?: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval?: "month" | "year" | null;
  installmentCount?: number | null;
  isDefault?: boolean;
};

export type CourseLitProductPreview = {
  id: string;
  slug: string;
  kind: "course" | "download";
  title: string;
  description: string;
  leadMagnet: boolean;
  enrolled?: boolean;
  featuredImage: MediaRef | null;
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{
    id: string;
    title: string;
    sectionId: string | null;
    requiresEnrollment: boolean;
  }>;
  plans: CourseLitPlan[];
  includedWithCommunity?: boolean;
  community?: { id: string; plans: CourseLitPlan[] } | null;
};

export type CourseLitCommunityPreview = {
  id: string;
  slug: string;
  name: string;
  description: string;
  featuredImage: MediaRef | null;
  membersCount: number;
  plans: CourseLitPlan[];
  membership?: { status?: string } | null;
};

export type CourseLitSalesPageData =
  | { resourceType: "product"; product: CourseLitProductPreview }
  | { resourceType: "community"; community: CourseLitCommunityPreview };

export type BannerResource = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: CourseLitProductPreview["kind"] | null;
  leadMagnet: boolean;
  enrolled: boolean;
  membersCount: number | null;
  featuredImage: CourseLitCommunityPreview["featuredImage"];
  plans: CourseLitPlan[];
  includedWithCommunity?: boolean;
  community?: { id: string; plans: CourseLitPlan[] } | null;
};
