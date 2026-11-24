import type { MediaRef } from "@courselit/api-contract";
import type { CourseLitPermission } from "@courselit/api-contract/team-permissions";

export type ProductKind = "course" | "download";

export type ProductStatus = "draft" | "published";

export type SalesPage = {
  resourceType: "product" | "community";
  resourceId: string;
  slug: string;
  pageId: string | null;
};

/** Course lessons are pages or SCORM; download products hold files. */
export type LessonType = "page" | "scorm" | "file";

export type LessonContent = Record<string, unknown>;

export type Product = {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  featuredImage: MediaRef | null;
  privacy: "public" | "unlisted";
  leadMagnet: boolean;
  certificate: boolean;
  discussions: boolean;
  kind: ProductKind;
  status: ProductStatus;
  slug: string;
  /** An active community plan includes it, so it needs no plan of its own. */
  includedInCommunityPlan?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currency?: string;
  /** Lifetime revenue in the currency's minor unit (product list only). */
  salesAmountMinor?: number;
  customers?: number;
  sections?: Section[];
  lessons?: Lesson[];
  salesPage?: SalesPage | null;
};

export type Section = {
  id: string;
  title: string;
  position: number;
  dripEnabled: boolean;
  dripType: "relative-date" | "exact-date" | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
};

export type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  mediaId: string | null;
  sectionId: string | null;
  position: number;
  status: ProductStatus;
  requiresEnrollment: boolean;
  /** Single-lesson reads and writes only; lists carry neither content form. */
  content?: LessonContent | null;
  /** The page as Markdown (single-lesson reads only); null for SCORM and files. */
  markdown?: string | null;
  /** Sent back as `expectedContentVersion` with content. */
  contentVersion: number;
  /** A page has saved edits learners don't see until they are published. */
  hasUnpublishedChanges: boolean;
  /** When the content learners read was last replaced. */
  contentPublishedAt: string | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
  availableAt: string | null;
  publishedAt?: string | null;
};

export type StorefrontPlan = {
  id: string;
  name: string;
  description: string;
  /** Community plans: every published product, including later ones. */
  includesAllProducts?: boolean;
  includedProducts: string[];
  providerProductId: string | null;
  type: "free" | "onetime" | "emi" | "subscription";
  kind: "free" | "one_time" | "subscription" | "installment";
  /** Read-only school-level currency projection; never sent when saving a plan. */
  currency: string;
  oneTimeAmount: number | null;
  emiAmount: number | null;
  emiTotalInstallments: number | null;
  subscriptionMonthlyAmount: number | null;
  subscriptionYearlyAmount: number | null;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  status: "active" | "archived";
  isDefault: boolean;
};

export type School = {
  id: string;
  name: string;
  subdomain?: string;
  storefrontHost?: string | null;
  storefrontOrigin?: string | null;
  currency: string;
  hideCourseLitBranding?: boolean;
  permissions?: readonly CourseLitPermission[] | readonly string[];
  selected?: boolean;
};
