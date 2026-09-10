import type { CourseLitPermission } from "@courselit/api-contract/team-permissions";

export type ProductKind = "course" | "download";

export type ProductStatus = "draft" | "published";

export type SalesPage = {
  resourceType: "product" | "community";
  resourceId: string;
  slug: string;
  pageId: string | null;
  status: "pending" | "provisioning" | "ready" | "failed";
  lastError: string | null;
};

export type LessonType =
  | "text"
  | "video"
  | "audio"
  | "pdf"
  | "file"
  | "embed"
  | "quiz"
  | "scorm";

export type LessonContent = Record<string, unknown>;

export type Product = {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  featuredMedia: {
    id: string;
    canonicalUrl: string;
    thumbnailUrl: string | null;
    fileName: string;
    altText: string;
  } | null;
  privacy: "public" | "unlisted";
  leadMagnet: boolean;
  certificate: boolean;
  discussions: boolean;
  kind: ProductKind;
  status: ProductStatus;
  slug: string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currency?: string;
  sales?: number;
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
  downloadable: boolean;
  requiresEnrollment: boolean;
  content: LessonContent | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
  availableAt: string | null;
  publishedAt?: string | null;
};

export type StorefrontPlan = {
  id: string;
  name: string;
  description: string;
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
  currency: string;
  permissions?: readonly CourseLitPermission[] | readonly string[];
  selected?: boolean;
};
