import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const platformErrorSchema = z.object({
  code: z.enum([
    "unauthenticated",
    "credential_ambiguous",
    "tenant_required",
    "tenant_forbidden",
    "forbidden",
    "not_found",
    "conflict",
    "validation_failed",
    "rate_limited",
    "internal_error",
  ]),
  message: z.string(),
  details: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  time: z.string(),
});

export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  checks: z.record(z.string(), z.boolean()),
});

export const productSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  kind: z.enum(["course", "download"]),
  status: z.enum(["draft", "published"]),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  featuredMedia: z
    .object({
      id: z.string(),
      canonicalUrl: z.string().url(),
      thumbnailUrl: z.string().url().nullable(),
      fileName: z.string(),
      altText: z.string(),
    })
    .nullable(),
  privacy: z.enum(["public", "unlisted"]),
  leadMagnet: z.boolean(),
  certificate: z.boolean(),
  discussions: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productListItemSchema = productSchema.extend({
  currency: z.string(),
  sales: z.number().int().nonnegative(),
  customers: z.number().int().nonnegative(),
});

export const publicProductListItemSchema = productSchema.extend({
  currency: z.string(),
  priceMinor: z.number().int().nonnegative().nullable(),
});

export const learnerProductSchema = productSchema.extend({
  totalLessons: z.number().int().nonnegative(),
  completedLessonsCount: z.number().int().nonnegative(),
  certificateId: z.string().nullable(),
  downloaded: z.boolean(),
});

export const listProductsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  kind: z.enum(["course", "download"]).optional(),
});

export const createProductBodySchema = z.object({
  kind: z.enum(["course", "download"]).default("course"),
  slug: z.string().trim().min(1).max(200).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).default(""),
});

export const updateProductBodySchema = z.object({
  status: z.enum(["draft", "published"]).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional(),
  featuredMediaId: z.string().min(1).nullable().optional(),
  privacy: z.enum(["public", "unlisted"]).optional(),
  leadMagnet: z.boolean().optional(),
  certificate: z.boolean().optional(),
  discussions: z.boolean().optional(),
});

export const productCertificateTemplateSchema = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string().max(400),
  signatureName: z.string(),
  signatureDesignation: z.string(),
  signatureImageId: z.string().nullable(),
  logoId: z.string().nullable(),
});
export const upsertProductCertificateTemplateBodySchema = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(200),
  description: z.string().max(400),
  signatureName: z.string().max(200),
  signatureDesignation: z.string().max(200),
  signatureImageId: z.string().min(1).nullable(),
  logoId: z.string().min(1).nullable(),
});

export const storefrontPlanSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  productId: z.string(),
  name: z.string(),
  description: z.string(),
  includedProducts: z.array(z.string()),
  providerProductId: z.string().nullable(),
  // `type` and the amount fields mirror CourseLit's production PaymentPlan
  // representation. `kind`/amountMinor remain derived target fields for the
  // checkout adapter and existing clients.
  type: z.enum(["free", "onetime", "emi", "subscription"]),
  kind: z.enum(["free", "one_time", "subscription", "installment"]),
  // This is a school-level projection, not a payment-plan input or column.
  currency: z.string(),
  oneTimeAmount: z.number().nullable(),
  emiAmount: z.number().nullable(),
  emiTotalInstallments: z.number().int().nullable(),
  subscriptionMonthlyAmount: z.number().nullable(),
  subscriptionYearlyAmount: z.number().nullable(),
  amountMinor: z.number().int().nonnegative(),
  billingInterval: z.enum(["month", "year"]).nullable(),
  installmentCount: z.number().int().min(2).nullable(),
  status: z.enum(["active", "archived"]),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const productAnalyticsRangeSchema = z.enum(["7d", "30d", "90d", "1y"]);
export const activityRangeSchema = productAnalyticsRangeSchema;
const productAnalyticsMetricSchema = z.object({
  count: z.number().int().nonnegative(),
  growth: z.number(),
});
export const productAnalyticsSchema = z.object({
  productId: z.string(),
  range: productAnalyticsRangeSchema,
  currency: z.string(),
  sales: z.object({
    amountMinor: z.number().int().nonnegative(),
    growth: z.number(),
    points: z.array(
      z.object({
        date: z.string(),
        amountMinor: z.number().int().nonnegative(),
      }),
    ),
  }),
  customers: productAnalyticsMetricSchema,
  completions: productAnalyticsMetricSchema,
  downloads: productAnalyticsMetricSchema,
});
const activityMetricSchema = z.object({
  count: z.number().nonnegative(),
  growth: z.number(),
});
export const schoolOverviewSchema = z.object({
  range: activityRangeSchema,
  currency: z.string(),
  sales: z.object({
    amountMinor: z.number().int().nonnegative(),
    growth: z.number(),
    points: z.array(
      z.object({
        date: z.string(),
        amountMinor: z.number().int().nonnegative(),
      }),
    ),
  }),
  customers: activityMetricSchema,
  communityMembers: activityMetricSchema,
  subscribers: activityMetricSchema,
});
const storefrontPlanInputFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2_000).default(""),
  // Retained for the shared plan shape; product-owned plans reject non-empty
  // values because included products belong to community plans in main.
  includedProducts: z.array(z.string()).default([]),
  // `type` and the amount fields preserve the production payment-plan model;
  // `kind`/minor-unit fields are the API's derived checkout representation.
  kind: z.enum(["free", "one_time", "subscription", "installment"]).optional(),
  type: z.enum(["free", "onetime", "emi", "subscription"]).optional(),
  oneTimeAmount: z.number().nonnegative().nullable().optional(),
  emiAmount: z.number().nonnegative().nullable().optional(),
  emiTotalInstallments: z.number().int().min(2).max(60).nullable().optional(),
  subscriptionMonthlyAmount: z.number().nonnegative().nullable().optional(),
  subscriptionYearlyAmount: z.number().nonnegative().nullable().optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  billingInterval: z.enum(["month", "year"]).nullable().optional(),
  installmentCount: z.number().int().min(2).max(60).nullable().optional(),
  providerProductId: z.string().trim().min(1).max(200).nullable().optional(),
} as const;
export const createStorefrontPlanBodySchema = z
  .object({
    ...storefrontPlanInputFields,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.kind && !value.type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["type"] });
    }
  });
export const updateStorefrontPlanBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2_000).optional(),
    includedProducts: z.array(z.string()).optional(),
    kind: z.enum(["free", "one_time", "subscription", "installment"]).optional(),
    type: z.enum(["free", "onetime", "emi", "subscription"]).optional(),
    oneTimeAmount: z.number().nonnegative().nullable().optional(),
    emiAmount: z.number().nonnegative().nullable().optional(),
    emiTotalInstallments: z.number().int().min(2).max(60).nullable().optional(),
    subscriptionMonthlyAmount: z.number().nonnegative().nullable().optional(),
    subscriptionYearlyAmount: z.number().nonnegative().nullable().optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    billingInterval: z.enum(["month", "year"]).nullable().optional(),
    installmentCount: z.number().int().min(2).max(60).nullable().optional(),
    providerProductId: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .strict();

export const communityPaymentPlanSchema = storefrontPlanSchema
  .omit({ productId: true })
  .extend({ communityId: z.string() });
export const createCommunityPaymentPlanBodySchema = createStorefrontPlanBodySchema;
export const updateCommunityPaymentPlanBodySchema = updateStorefrontPlanBodySchema;

export const communityCheckoutSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  communityId: z.string(),
  planId: z.string(),
  provider: z.enum(["free", "stripe", "lemonsqueezy", "razorpay"]),
  status: z.enum(["pending", "paid", "failed", "cancelled", "refunded", "disputed"]),
  currency: z.string(),
  amountMinor: z.number().int().nonnegative(),
  checkoutUrl: z.string().nullable(),
  checkoutData: z.object({
    provider: z.enum(["stripe", "lemonsqueezy", "razorpay"]),
    publicKey: z.string().optional(),
    orderId: z.string().optional(),
    subscriptionId: z.string().optional(),
    customerEmail: z.string().optional(),
    customerName: z.string().optional(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const createLearnerCommunityCheckoutBodySchema = z.object({
  planId: z.string().min(1),
  joiningReason: z.string().max(2_000).default(""),
  returnUrl: z.string().url().optional(),
});

export const storefrontCheckoutSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  productId: z.string(),
  planId: z.string(),
  provider: z.enum(["free", "stripe", "lemonsqueezy", "razorpay"]),
  status: z.enum(["pending", "paid", "failed", "cancelled", "refunded", "disputed"]),
  currency: z.string(),
  amountMinor: z.number().int().nonnegative(),
  checkoutUrl: z.string().nullable(),
  checkoutData: z.object({
    provider: z.enum(["stripe", "lemonsqueezy", "razorpay"]),
    publicKey: z.string().optional(),
    orderId: z.string().optional(),
    subscriptionId: z.string().optional(),
    customerEmail: z.string().optional(),
    customerName: z.string().optional(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const paymentWebhookResponseSchema = z.object({
  received: z.boolean(),
  duplicate: z.boolean(),
  status: z.enum(["processed", "ignored"]),
});
export const createLearnerCheckoutBodySchema = z.object({
  planId: z.string().min(1),
  returnUrl: z.string().url().optional(),
});
export const createCheckoutSessionBodySchema = z.object({
  productId: z.string().min(1),
  planId: z.string().min(1),
});
export const storefrontCheckoutSessionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  planId: z.string(),
  productTitle: z.string(),
  productKind: z.enum(["course", "download"]),
  planName: z.string(),
  planDescription: z.string(),
  planType: z.enum(["free", "onetime", "emi", "subscription"]),
  currency: z.string(),
  amountMinor: z.number().int().nonnegative(),
  billingInterval: z.enum(["month", "year"]).nullable(),
  installmentCount: z.number().int().nullable(),
  status: z.enum(["open", "completed", "expired"]),
  checkoutId: z.string().nullable(),
  checkoutStatus: z
    .enum(["pending", "paid", "failed", "cancelled", "refunded", "disputed"])
    .nullable(),
  expiresAt: z.string(),
});
export const startCheckoutSessionBodySchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const entitlementSchema = z.object({
  schoolId: z.string(),
  activePaidPlan: z.string().nullable(),
  entitled: z.boolean(),
  subscriptionStatus: z.string().nullable(),
});

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  status: z.enum(["active", "read_only", "maintenance", "migrating", "deleted"]),
  locale: z.string(),
  currency: z.string(),
  selected: z.boolean().optional(),
  frontlit: z
    .object({
      status: z.enum(["pending", "provisioning", "ready", "action_required"]),
      teamId: z.string().nullable(),
      lastSuccessfulSyncAt: z.string().datetime().nullable(),
      lastError: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
export const schoolPaymentSettingsSchema = z.object({
  provider: z.enum(["stripe", "lemonsqueezy", "razorpay"]).nullable(),
  stripe: z.object({
    publishableKey: z.string(),
    secretConfigured: z.boolean(),
    webhookSecretConfigured: z.boolean(),
  }),
  razorpay: z.object({
    keyId: z.string(),
    secretConfigured: z.boolean(),
    webhookSecretConfigured: z.boolean(),
  }),
  lemonsqueezy: z.object({
    storeId: z.string(),
    oneTimeVariantId: z.string(),
    monthlyVariantId: z.string(),
    yearlyVariantId: z.string(),
    apiKeyConfigured: z.boolean(),
    webhookSecretConfigured: z.boolean(),
  }),
});
export const updateSchoolPaymentSettingsBodySchema = z.object({
  provider: z.enum(["stripe", "lemonsqueezy", "razorpay"]).nullable().optional(),
  stripe: z.object({
    publishableKey: z.string().optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
  razorpay: z.object({
    keyId: z.string().optional(),
    keySecret: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
  lemonsqueezy: z.object({
    apiKey: z.string().optional(),
    storeId: z.string().optional(),
    oneTimeVariantId: z.string().optional(),
    monthlyVariantId: z.string().optional(),
    yearlyVariantId: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
}).strict();
export const frontlitContentSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["page", "blog"]),
  slug: z.string(),
  status: z.enum(["draft", "published", "published_with_changes"]),
  featuredImage: z.record(z.string(), z.unknown()).nullable().optional(),
  excerpt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export const salesPageSchema = z.object({
  resourceType: z.enum(["product", "community"]),
  resourceId: z.string(),
  slug: z.string(),
  pageId: z.string().nullable(),
  status: z.enum(["pending", "provisioning", "ready", "failed"]),
  lastError: z.string().nullable(),
});
export const frontlitWidgetSchema = z.object({
  widgetId: z.string(),
  name: z.string(),
  deletable: z.boolean(),
  moveable: z.boolean(),
  shared: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
export const frontlitPageSchema = frontlitContentSummarySchema.extend({
  deletable: z.boolean(),
  publishedAt: z.string().nullable().optional(),
  layout: z.array(frontlitWidgetSchema),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  socialImage: z.record(z.string(), z.unknown()).nullable().optional(),
  robotsAllowed: z.boolean().nullable().optional(),
  draftLayout: z.array(frontlitWidgetSchema),
  draftTitle: z.string().nullable().optional(),
  draftDescription: z.string().nullable().optional(),
  draftSocialImage: z.record(z.string(), z.unknown()).nullable().optional(),
  draftRobotsAllowed: z.boolean().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export const frontlitThemeSchema = z.object({
  themeId: z.string(),
  name: z.string(),
  style: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export const frontlitSettingsSchema = z.object({
  themeId: z.string().nullable(),
});
export const updateSchoolFrontLitSettingsBodySchema = z
  .object({ themeId: z.string().nullable() })
  .strict();
export const createSchoolFrontLitThemeBodySchema = z
  .object({
    name: z.string().min(1),
    style: z.record(z.string(), z.unknown()),
  })
  .strict();
export const updateSchoolFrontLitThemeBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export const frontlitBlogSchema = frontlitContentSummarySchema.extend({
  publishedAt: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.record(z.string(), z.unknown()).nullable().optional(),
  meta: z.record(z.string(), z.unknown()),
  draftTitle: z.string(),
  draftContent: z.record(z.string(), z.unknown()),
  draftExcerpt: z.string().nullable().optional(),
  draftFeaturedImage: z.record(z.string(), z.unknown()).nullable().optional(),
  draftMeta: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

/** Published site data exposed by CourseLit for learner/public rendering.
 * Learners never resolve or call FrontLit directly; the CourseLit API owns
 * that integration and returns only public fields here. */
export const publicSiteSettingsSchema = z.object({
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  logo: z.record(z.string(), z.unknown()).nullable(),
  themeId: z.string().nullable(),
  theme: z.record(z.string(), z.unknown()).nullable(),
  codeInjectionHead: z.string(),
  codeInjectionBody: z.string(),
});
export const schoolCodeInjectionSchema = z.object({
  codeInjectionHead: z.string(),
  codeInjectionBody: z.string(),
});
const codeInjectionSnippetSchema = z.string().max(100_000);
export const updateSchoolCodeInjectionBodySchema = z
  .object({
    codeInjectionHead: codeInjectionSnippetSchema.optional(),
    codeInjectionBody: codeInjectionSnippetSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.codeInjectionHead !== undefined || value.codeInjectionBody !== undefined,
  );
export const publicSitePageSchema = z.object({
  pageId: z.string(),
  name: z.string(),
  slug: z.string(),
  layout: z.array(frontlitWidgetSchema),
  title: z.string().nullable(),
  description: z.string().nullable(),
  socialImage: z.record(z.string(), z.unknown()).nullable(),
  robotsAllowed: z.boolean().nullable(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export const publicSiteBlogSchema = z.object({
  documentId: z.string(),
  slug: z.string(),
  title: z.string().nullable(),
  content: z.record(z.string(), z.unknown()).nullable(),
  excerpt: z.string().nullable(),
  featuredImage: z.record(z.string(), z.unknown()).nullable(),
  meta: z.record(z.string(), z.unknown()),
  publishedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export const updateSchoolFrontLitPageBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    layout: z.array(frontlitWidgetSchema).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    socialImage: z.record(z.string(), z.unknown()).nullable().optional(),
    robotsAllowed: z.boolean().optional(),
  })
  .strict();
export const updateSchoolFrontLitBlogBodySchema = z
  .object({
    slug: z.string().trim().min(1).max(200).optional(),
    title: z.string().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    excerpt: z.string().optional(),
    featuredImage: z.record(z.string(), z.unknown()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export const createSchoolFrontLitPageBodySchema = z
  .object({ name: z.string().trim().min(1).max(200) })
  .strict();
export const createSchoolFrontLitBlogBodySchema = z
  .object({ title: z.string().trim().min(1).max(200) })
  .strict();
export const updateSchoolBodySchema = z
  .object({
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase()),
  })
  .strict();
export const schoolHostSchema = z.object({
  hostname: z.string(),
  kind: z.enum(["subdomain", "custom"]),
  verificationStatus: z.enum(["verified", "unverified"]),
  verifiedAt: z.string().nullable(),
  isPrimary: z.boolean(),
});
export const createSchoolHostBodySchema = z.object({
  hostname: z.string().trim().min(3).max(253),
});
export const verifySchoolHostBodySchema = z.object({
  token: z.string().trim().min(1).max(200),
});
const mediaResourceTypes = [
  "school_branding",
  "blog_artwork",
  "product_artwork",
  "product_content",
  "lesson_media",
  "lesson_content",
  "downloadable_file",
  "community_artwork",
  "community_content",
  "learner_avatar",
  "certificate_template",
] as const;
export const mediaResourceTypeSchema = z.enum(mediaResourceTypes);
export const mediaSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  canonicalUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  fileName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().positive(),
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
  kind: z.enum(["image", "video", "audio", "document", "other"]),
  altText: z.string(),
  caption: z.string(),
  accessPolicy: z.enum(["public", "private"]),
  status: z.enum(["active", "deleting"]),
  usageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const mediaUploadAuthorizationSchema = z.object({
  uploadId: z.string(),
  uploadUrl: z.string().url(),
  uploadProtocol: z.enum(["direct", "tus"]),
  uploadMethod: z.enum(["PUT", "POST"]),
  uploadHeaders: z.record(z.string(), z.string()),
  uploadFields: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});
export const authorizeMediaUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(200),
  byteSize: z.number().int().positive().max(1_000_000_000),
  purpose: mediaResourceTypeSchema,
  accessPolicy: z.enum(["public", "private"]).default("private"),
});
export const finalizeMediaUploadBodySchema = z.object({
  uploadId: z.string().trim().min(1).max(255),
  altText: z.string().max(1_000).default(""),
  caption: z.string().max(2_000).default(""),
  accessPolicy: z.enum(["public", "private"]).default("private"),
});
export const learnerCommunityMediaAuthorizationBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(200),
  byteSize: z.number().int().positive().max(100_000_000),
  accessPolicy: z.enum(["public", "private"]).default("private"),
});
export const learnerCommunityMediaListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const searchUnsplashQuerySchema = z.object({
  q: z.string().max(200).optional(),
});
export const unsplashPhotoSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbUrl: z.string().url(),
  alt: z.string().optional(),
  photographer: z.string().optional(),
});
export const searchUnsplashResponseSchema = z.object({
  configured: z.boolean(),
  items: z.array(unsplashPhotoSchema),
});
export const updateMediaBodySchema = z.object({
  altText: z.string().max(1_000).optional(),
  caption: z.string().max(2_000).optional(),
  accessPolicy: z.enum(["public", "private"]).optional(),
});
export const mediaReferenceSchema = z.object({
  resourceType: mediaResourceTypeSchema,
  resourceId: z.string().trim().min(1).max(255),
  parentResourceId: z.string().trim().min(1).max(255).nullable().optional(),
});
export const reconcileMediaReferencesBodySchema = z.object({
  references: z.array(mediaReferenceSchema).max(100),
});
export const createSchoolHostResponseSchema = z.object({
  host: schoolHostSchema,
  verification: z.object({
    method: z.literal("dns_txt"),
    name: z.string(),
    value: z.string(),
  }),
});
export const apiKeySchema = z.object({
  id: z.string(),
  publicId: z.string(),
  raw: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  revokedAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});
export const invitationSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
  token: z.string().optional(),
});

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["text", "video", "audio", "pdf", "file", "embed", "quiz", "scorm"]),
  mediaId: z.string().nullable(),
  sectionId: z.string().nullable(),
  position: z.number().int(),
  status: z.enum(["draft", "published"]),
  downloadable: z.boolean(),
  requiresEnrollment: z.boolean(),
  content: z.record(z.string(), z.unknown()).nullable(),
  dripDelaySeconds: z.number().int().nonnegative().nullable(),
  dripAt: z.string().nullable(),
  availableAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number().int(),
  dripEnabled: z.boolean(),
  dripType: z.enum(["relative-date", "exact-date"]).nullable(),
  dripDelaySeconds: z.number().int().nonnegative().nullable(),
  dripAt: z.string().nullable(),
});

export const productDetailSchema = productSchema.extend({
  enrolled: z.boolean(),
  sections: z.array(sectionSchema),
  lessons: z.array(lessonSchema),
});

export const learnerLessonMediaSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  fileName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().positive(),
});

export const scormRuntimeStateSchema = z.record(z.string(), z.unknown());
export const scormRuntimeUpdateBodySchema = z.union([
  z.object({
    updates: z
      .record(z.string().min(1).max(255), z.string().max(4096))
      .refine(
        (updates) =>
          Object.keys(updates).length > 0 && Object.keys(updates).length <= 100,
      ),
  }),
  z.object({
    element: z.string().min(1).max(255),
    value: z.string().max(4096),
  }),
]);
export const scormPackageInfoSchema = z.object({
  version: z.enum(["1.2", "2004"]),
  title: z.string(),
  entryPoint: z.string(),
  scoCount: z.number().int().positive(),
  fileCount: z.number().int().positive(),
});
export const processScormPackageBodySchema = z.object({
  mediaId: z.string().min(1),
});
export const evaluateQuizBodySchema = z.object({
  answers: z.array(z.array(z.number().int().nonnegative()).max(1000)).min(1).max(100),
});
export const quizEvaluationSchema = z.object({
  pass: z.boolean(),
  score: z.number(),
  requiresPassingGrade: z.boolean(),
  passingGrade: z.number(),
});

export const communityActorSchema = z.object({
  id: z.string(),
  kind: z.enum(["learner", "admin"]),
  name: z.string(),
  email: z.string().email().nullable(),
  imageUrl: z.string().nullable(),
});

export const communityMembershipSchema = z.object({
  id: z.string(),
  communityId: z.string(),
  learnerId: z.string().nullable(),
  adminUserId: z.string().nullable(),
  member: communityActorSchema.nullable(),
  status: z.enum([
    "active",
    "payment_failed",
    "expired",
    "pending",
    "rejected",
    "paused",
  ]),
  role: z.enum(["member", "moderator", "owner"]),
  joiningReason: z.string(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const communityFeaturedMediaSchema = z.object({
  id: z.string(),
  canonicalUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  fileName: z.string(),
  altText: z.string(),
});

export const communitySchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  banner: z.string(),
  categories: z.array(z.string()),
  enabled: z.boolean(),
  autoAcceptMembers: z.boolean(),
  joiningReasonText: z.string(),
  featuredMedia: communityFeaturedMediaSchema.nullable(),
  membersCount: z.number().int().nonnegative(),
  postsCount: z.number().int().nonnegative(),
  deletedAt: z.string().nullable(),
  membership: communityMembershipSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCommunityBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(20_000).default(""),
  banner: z.string().max(20_000).default(""),
  categories: z.array(z.string().trim().min(1).max(100)).min(1).default(["General"]),
  enabled: z.boolean().default(false),
  autoAcceptMembers: z.boolean().default(true),
  joiningReasonText: z.string().max(500).default(""),
});

export const updateCommunityBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(20_000).optional(),
  banner: z.string().max(20_000).optional(),
  categories: z.array(z.string().trim().min(1).max(100)).min(1).optional(),
  enabled: z.boolean().optional(),
  autoAcceptMembers: z.boolean().optional(),
  joiningReasonText: z.string().max(500).optional(),
  featuredMediaId: z.string().min(1).nullable().optional(),
});

export const addCommunityCategoryBodySchema = z.object({
  category: z.string().trim().min(1).max(100),
});

export const deleteCommunityCategoryBodySchema = z.object({
  migrateToCategory: z.string().trim().min(1).max(100).nullable().optional(),
});

export const communityMediaSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video", "pdf"]),
  title: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  fileName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().positive(),
});

const communityMediaIdsSchema = z.array(z.string().min(1).max(255)).max(10).optional();

export const communityReactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  active: z.boolean(),
});

export const communityPostSchema = z.object({
  id: z.string(),
  communityId: z.string(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  author: communityActorSchema.nullable(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  media: z.array(communityMediaSchema),
  reactions: z.array(communityReactionSchema),
  commentsCount: z.number().int().nonnegative(),
  subscribed: z.boolean(),
  pinned: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const learnerFeedPostSchema = communityPostSchema.extend({
  community: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
});

export const communityCommentSchema = z.object({
  id: z.string(),
  communityId: z.string(),
  postId: z.string(),
  parentCommentId: z.string().nullable(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  author: communityActorSchema.nullable(),
  content: z.string(),
  media: z.array(communityMediaSchema),
  reactions: z.array(communityReactionSchema),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export const notificationListQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const notificationPreferenceTypeSchema = z.enum([
  "community_post_created",
  "community_post_liked",
  "community_comment",
  "community_comment_liked",
  "community_reply",
  "community_reply_liked",
  "community_membership_granted",
  "course_discussion_comment_created",
  "course_discussion_reacted",
]);
export const notificationPreferenceSchema = z.object({
  type: notificationPreferenceTypeSchema,
  appEnabled: z.boolean(),
});
export const updateNotificationPreferenceBodySchema = z.object({
  appEnabled: z.boolean(),
});

export const communityReportContentSchema = z.object({
  id: z.string(),
  content: z.string(),
  media: z.array(communityMediaSchema),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  author: communityActorSchema.nullable(),
});

export const communityReportSchema = z.object({
  id: z.string(),
  communityId: z.string(),
  contentType: z.enum(["post", "comment", "reply"]),
  contentId: z.string(),
  contentParentId: z.string().nullable(),
  reporterId: z.string().nullable(),
  reporterKind: z.enum(["learner", "admin"]).nullable(),
  content: communityReportContentSchema.nullable(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  reason: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const communityListQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  category: z.string().trim().min(1).max(100).optional(),
});

export const communityMembershipListQuerySchema = communityListQuerySchema.extend({
  status: z
    .enum(["active", "payment_failed", "expired", "pending", "rejected", "paused"])
    .optional(),
});

export const communityStatusQuerySchema = communityListQuerySchema.extend({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
});

export const createCommunityPostBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(20_000),
  category: z.string().trim().min(1).max(100).default("General"),
  mediaIds: communityMediaIdsSchema,
});

export const updateCommunityPostBodySchema = createCommunityPostBodySchema
  .partial()
  .extend({
    pinned: z.boolean().optional(),
  });

export const createCommunityCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  parentCommentId: z.string().min(1).nullable().optional(),
  mediaIds: communityMediaIdsSchema,
});

export const updateCommunityCommentBodySchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  mediaIds: communityMediaIdsSchema,
});

export const communityReactionBodySchema = z.object({
  entityType: z.enum(["post", "comment", "reply"]),
  entityId: z.string().min(1),
  emoji: z.enum(["👍", "❤️", "😄", "🎉", "😢", "😮"]),
});

export const communitySubscriptionBodySchema = z.object({
  subscribed: z.boolean(),
});

export const createCommunityReportBodySchema = z.object({
  contentType: z.enum(["post", "comment", "reply"]),
  contentId: z.string().min(1),
  reason: z.string().trim().min(1).max(2_000),
});

export const updateCommunityReportBodySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]),
  rejectionReason: z.string().max(2_000).nullable().optional(),
});

export const discussionContentSchema = z
  .object({ type: z.literal("doc") })
  .passthrough();
export const discussionListQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const discussionCommentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  entityType: z.literal("lesson"),
  entityId: z.string(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  content: discussionContentSchema,
  likesCount: z.number().int().nonnegative(),
  hasLiked: z.boolean(),
  replyCount: z.number().int().nonnegative(),
  replies: z.array(z.lazy(() => discussionReplySchema)),
  replyNextCursor: z.string().nullable(),
  hasMoreReplies: z.boolean(),
  deleted: z.boolean(),
  deletedAt: z.string().nullable(),
  isEdited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const discussionReplySchema = z.object({
  id: z.string(),
  productId: z.string(),
  entityType: z.literal("lesson"),
  entityId: z.string(),
  commentId: z.string(),
  parentReplyId: z.string().nullable(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  content: discussionContentSchema,
  likesCount: z.number().int().nonnegative(),
  hasLiked: z.boolean(),
  deleted: z.boolean(),
  deletedAt: z.string().nullable(),
  isEdited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const discussionSummarySchema = z.object({
  productId: z.string(),
  entityType: z.literal("lesson"),
  entityId: z.string(),
  lessonTitle: z.string(),
  commentsCount: z.number().int().nonnegative(),
  repliesCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  activityCountIncludingDeleted: z.number().int().nonnegative(),
  lastActivityAt: z.string(),
  lastCommentId: z.string().nullable(),
  lastReplyId: z.string().nullable(),
});
export const discussionReportSchema = z.object({
  id: z.string(),
  productId: z.string(),
  entityType: z.literal("lesson"),
  entityId: z.string(),
  contentType: z.enum(["comment", "reply"]),
  contentId: z.string(),
  commentId: z.string().nullable(),
  reporterId: z.string().nullable(),
  reporterKind: z.enum(["learner", "admin"]).nullable(),
  authorId: z.string().nullable(),
  authorKind: z.enum(["learner", "admin"]).nullable(),
  reason: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]),
  rejectionReason: z.string().nullable(),
  lessonTitle: z.string(),
  contentPreview: z.string().nullable(),
  contentDeleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const createDiscussionCommentBodySchema = z.object({
  content: discussionContentSchema,
});
export const createDiscussionReplyBodySchema = z.object({
  content: discussionContentSchema,
  parentReplyId: z.string().min(1).optional(),
});
export const discussionLikeBodySchema = z.object({
  contentType: z.enum(["comment", "reply"]),
  contentId: z.string().min(1),
});
export const discussionSubscriptionBodySchema = z.object({
  subscription: z.boolean(),
});
export const createDiscussionReportBodySchema = z.object({
  contentType: z.enum(["comment", "reply"]),
  contentId: z.string().min(1),
  reason: z.string().trim().min(1).max(2_000),
});
export const updateDiscussionReportBodySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]),
  rejectionReason: z.string().max(2_000).nullable().optional(),
});

export const updateCommunityMembershipBodySchema = z.object({
  status: z.enum(["active", "pending", "rejected"]).optional(),
  role: z.enum(["member", "moderator", "owner"]).optional(),
  rejectionReason: z.string().max(2_000).nullable().optional(),
});

export const joinCommunityBodySchema = z.object({
  joiningReason: z.string().max(2_000).default(""),
});
export const leaveCommunityBodySchema = z.object({}).default({});
export const leaveCommunityResponseSchema = z.object({
  left: z.boolean(),
});

export const previewGrantSchema = z.object({
  token: z.string(),
  schoolId: z.string(),
  productId: z.string(),
  expiresAt: z.string(),
});

export const createPreviewGrantBodySchema = z.object({
  ttlSeconds: z.number().int().min(60).max(3600).default(900),
});

export const createLessonBodySchema = z.object({
  title: z.string().min(1).max(200),
  type: z
    .enum(["text", "video", "audio", "pdf", "file", "embed", "quiz", "scorm"])
    .default("text"),
  content: z.record(z.string(), z.unknown()).default({}),
  mediaId: z.string().min(1).nullable().optional(),
  downloadable: z.boolean().optional(),
  requiresEnrollment: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
  sectionId: z.string().min(1).optional(),
  dripDelaySeconds: z.number().int().min(0).max(315_360_000).nullable().optional(),
  dripAt: z.string().datetime().nullable().optional(),
});

export const updateLessonBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  mediaId: z.string().min(1).nullable().optional(),
  downloadable: z.boolean().optional(),
  requiresEnrollment: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
  sectionId: z.string().min(1).nullable().optional(),
  dripDelaySeconds: z.number().int().min(0).max(315_360_000).nullable().optional(),
  dripAt: z.string().datetime().nullable().optional(),
});

export const createSectionBodySchema = z.object({
  title: z.string().min(1).max(200),
  dripEnabled: z.boolean().optional(),
  dripType: z.enum(["relative-date", "exact-date"]).nullable().optional(),
  dripDelaySeconds: z.number().int().min(0).max(315_360_000).nullable().optional(),
  dripAt: z.string().datetime().nullable().optional(),
});

export const updateSectionBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dripEnabled: z.boolean().optional(),
  dripType: z.enum(["relative-date", "exact-date"]).nullable().optional(),
  dripDelaySeconds: z.number().int().min(0).max(315_360_000).nullable().optional(),
  dripAt: z.string().datetime().nullable().optional(),
});

export const reorderSectionsBodySchema = z.object({
  sectionIds: z.array(z.string().min(1)),
});

export const reorderLessonsBodySchema = z.object({
  lessonIds: z.array(z.string().min(1)),
  sectionAssignments: z
    .array(
      z.object({
        lessonId: z.string().min(1),
        sectionId: z.string().min(1).nullable(),
      }),
    )
    .optional(),
});

export const learnerSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  email: z.string().email(),
  name: z.string(),
});
export const adminLearnerSchema = learnerSchema.extend({
  status: z.enum(["active", "deactivated"]),
  createdAt: z.string(),
});
export const listLearnersQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const updateLearnerBodySchema = z.object({
  status: z.enum(["active", "deactivated"]),
});

export const enrollmentSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  productId: z.string(),
  source: z.enum([
    "free_signup",
    "admin_grant",
    "storefront_purchase",
    "included_product",
    "import",
    "integration",
  ]),
  status: z.enum([
    "active",
    "payment_failed",
    "expired",
    "pending",
    "rejected",
    "paused",
  ]),
});

export const progressSchema = z.object({
  lessonId: z.string(),
  enrollmentId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  courseCompleted: z.boolean(),
  certificateId: z.string().nullable(),
});
export const lessonProgressSchema = z.object({
  lessonId: z.string(),
  enrollmentId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export const listLearnerProgressQuerySchema = z.object({
  productId: z.string().min(1),
});
export const certificateTemplateSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  template: z.record(z.string(), z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const createCertificateTemplateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  template: z.record(z.string(), z.string()).default({}),
});
export const updateCertificateTemplateBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  template: z.record(z.string(), z.string()).optional(),
});
export const certificateSchema = z.object({
  id: z.string(),
  verificationId: z.string(),
  schoolId: z.string(),
  productId: z.string(),
  learnerId: z.string(),
  learnerName: z.string(),
  productTitle: z.string(),
  issuedAt: z.string(),
  revokedAt: z.string().nullable(),
});
export const certificateVerificationSchema = certificateSchema.extend({
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  signatureName: z.string(),
  signatureDesignation: z.string().nullable(),
  signatureImageUrl: z.string().url().nullable(),
  logoUrl: z.string().url().nullable(),
});

export const learnerAuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(200).optional(),
  identityLinkToken: z.string().min(1).max(200).optional(),
  schoolId: z.string().min(1).optional(),
});
export const learnerOtpRequestBodySchema = z.object({
  email: z.string().email(),
  schoolId: z.string().min(1).optional(),
});
export const learnerOtpVerifyBodySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).max(200).optional(),
  identityLinkToken: z.string().min(1).max(200).optional(),
  schoolId: z.string().min(1).optional(),
});
export const learnerIdentityLinkSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
});
export const learnerOtpRequestResponseSchema = z.object({
  expiresAt: z.string().datetime(),
});
export const createLearnerDownloadLinkBodySchema = z.object({}).default({});
export const learnerDownloadLinkSchema = z.object({
  token: z.string().length(128),
  expiresAt: z.string().datetime(),
});

export const createSchoolBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  subdomain: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.string().trim().min(2).max(35).default("en"),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),
  plan: z.enum(["oss", "pro", "business"]).optional(),
  interval: z.enum(["month", "year"]).optional(),
  catalogRevision: z.number().int().positive().optional(),
});

export const billingOfferSchema = z.object({
  catalogKey: z.string(),
  plan: z.enum(["pro", "business"]),
  interval: z.enum(["month", "year"]),
  currency: z.string(),
  amountMinor: z.number().int(),
  trialDays: z.number().int(),
});

export const billingCatalogSchema = z.object({
  catalogRevision: z.number().int().nullable(),
  currency: z.string().nullable(),
  checkoutAvailable: z.boolean(),
  offers: z.array(billingOfferSchema),
});

export const createSchoolResponseSchema = schoolSchema.extend({
  checkoutUrl: z.string().optional(),
});

export const contract = c.router({
  health: {
    method: "GET",
    path: "/health",
    responses: { 200: healthResponseSchema },
    summary: "Liveness",
  },
  ready: {
    method: "GET",
    path: "/ready",
    responses: { 200: readinessResponseSchema, 503: readinessResponseSchema },
    summary: "Readiness",
  },
  listCommunities: {
    method: "GET",
    path: "/v1/communities",
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communitySchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createCommunity: {
    method: "POST",
    path: "/v1/communities",
    body: createCommunityBodySchema,
    responses: {
      201: communitySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  getCommunity: {
    method: "GET",
    path: "/v1/communities/:communityId",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: communitySchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getSalesPage: {
    method: "GET",
    path: "/v1/sales-pages/:resourceType/:resourceId",
    pathParams: z.object({
      resourceType: z.enum(["product", "community"]),
      resourceId: z.string(),
    }),
    responses: {
      200: salesPageSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateCommunity: {
    method: "PATCH",
    path: "/v1/communities/:communityId",
    pathParams: z.object({ communityId: z.string() }),
    body: updateCommunityBodySchema,
    responses: {
      200: communitySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  addCommunityCategory: {
    method: "POST",
    path: "/v1/communities/:communityId/categories",
    pathParams: z.object({ communityId: z.string() }),
    body: addCommunityCategoryBodySchema,
    responses: {
      200: communitySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  deleteCommunityCategory: {
    method: "DELETE",
    path: "/v1/communities/:communityId/categories/:category",
    pathParams: z.object({ communityId: z.string(), category: z.string() }),
    body: deleteCommunityCategoryBodySchema,
    responses: {
      200: communitySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteCommunity: {
    method: "DELETE",
    path: "/v1/communities/:communityId",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listCommunityMembers: {
    method: "GET",
    path: "/v1/communities/:communityId/members",
    pathParams: z.object({ communityId: z.string() }),
    query: communityMembershipListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityMembershipSchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateCommunityMembership: {
    method: "PATCH",
    path: "/v1/community-memberships/:membershipId",
    pathParams: z.object({ membershipId: z.string() }),
    body: updateCommunityMembershipBodySchema,
    responses: {
      200: communityMembershipSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listCommunityPosts: {
    method: "GET",
    path: "/v1/communities/:communityId/posts",
    pathParams: z.object({ communityId: z.string() }),
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityPostSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createCommunityPost: {
    method: "POST",
    path: "/v1/communities/:communityId/posts",
    pathParams: z.object({ communityId: z.string() }),
    body: createCommunityPostBodySchema,
    responses: {
      201: communityPostSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateCommunityPost: {
    method: "PATCH",
    path: "/v1/community-posts/:postId",
    pathParams: z.object({ postId: z.string() }),
    body: updateCommunityPostBodySchema,
    responses: {
      200: communityPostSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteCommunityPost: {
    method: "DELETE",
    path: "/v1/community-posts/:postId",
    pathParams: z.object({ postId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listCommunityComments: {
    method: "GET",
    path: "/v1/community-posts/:postId/comments",
    pathParams: z.object({ postId: z.string() }),
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityCommentSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createCommunityComment: {
    method: "POST",
    path: "/v1/community-posts/:postId/comments",
    pathParams: z.object({ postId: z.string() }),
    body: createCommunityCommentBodySchema,
    responses: {
      201: communityCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateCommunityComment: {
    method: "PATCH",
    path: "/v1/community-comments/:commentId",
    pathParams: z.object({ commentId: z.string() }),
    body: updateCommunityCommentBodySchema,
    responses: {
      200: communityCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteCommunityComment: {
    method: "DELETE",
    path: "/v1/community-comments/:commentId",
    pathParams: z.object({ commentId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  toggleCommunityReaction: {
    method: "POST",
    path: "/v1/communities/:communityId/reactions",
    pathParams: z.object({ communityId: z.string() }),
    body: communityReactionBodySchema,
    responses: {
      200: z.object({ active: z.boolean(), emoji: z.string(), entityId: z.string() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  toggleCommunityPostSubscription: {
    method: "POST",
    path: "/v1/community-posts/:postId/subscription",
    pathParams: z.object({ postId: z.string() }),
    body: communitySubscriptionBodySchema,
    responses: {
      200: z.object({ subscribed: z.boolean() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createCommunityReport: {
    method: "POST",
    path: "/v1/communities/:communityId/reports",
    pathParams: z.object({ communityId: z.string() }),
    body: createCommunityReportBodySchema,
    responses: {
      201: communityReportSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listCommunityReports: {
    method: "GET",
    path: "/v1/communities/:communityId/reports",
    pathParams: z.object({ communityId: z.string() }),
    query: communityStatusQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityReportSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateCommunityReport: {
    method: "PATCH",
    path: "/v1/community-reports/:reportId",
    pathParams: z.object({ reportId: z.string() }),
    body: updateCommunityReportBodySchema,
    responses: {
      200: communityReportSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerCommunities: {
    method: "GET",
    path: "/v1/learner/communities",
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communitySchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listLearnerFeed: {
    method: "GET",
    path: "/v1/learner/feed",
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(learnerFeedPostSchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listAvailableLearnerCommunities: {
    method: "GET",
    path: "/v1/learner/communities/available",
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communitySchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  getLearnerCommunity: {
    method: "GET",
    path: "/v1/learner/communities/:communityId",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: communitySchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerCommunityPosts: {
    method: "GET",
    path: "/v1/learner/communities/:communityId/posts",
    pathParams: z.object({ communityId: z.string() }),
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityPostSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerCommunityPost: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/posts",
    pathParams: z.object({ communityId: z.string() }),
    body: createCommunityPostBodySchema,
    responses: {
      201: communityPostSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getLearnerCommunityPost: {
    method: "GET",
    path: "/v1/learner/community-posts/:postId",
    pathParams: z.object({ postId: z.string() }),
    responses: {
      200: communityPostSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerCommunityComments: {
    method: "GET",
    path: "/v1/learner/community-posts/:postId/comments",
    pathParams: z.object({ postId: z.string() }),
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communityCommentSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerCommunityComment: {
    method: "POST",
    path: "/v1/learner/community-posts/:postId/comments",
    pathParams: z.object({ postId: z.string() }),
    body: createCommunityCommentBodySchema,
    responses: {
      201: communityCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateLearnerCommunityComment: {
    method: "PATCH",
    path: "/v1/learner/community-comments/:commentId",
    pathParams: z.object({ commentId: z.string() }),
    body: updateCommunityCommentBodySchema,
    responses: {
      200: communityCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteLearnerCommunityComment: {
    method: "DELETE",
    path: "/v1/learner/community-comments/:commentId",
    pathParams: z.object({ commentId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  authorizeLearnerCommunityMediaUpload: {
    method: "POST",
    path: "/v1/learner/community-media/upload-authorizations",
    body: learnerCommunityMediaAuthorizationBodySchema,
    responses: {
      201: mediaUploadAuthorizationSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  finalizeLearnerCommunityMediaUpload: {
    method: "POST",
    path: "/v1/learner/community-media",
    body: finalizeMediaUploadBodySchema,
    responses: {
      201: mediaSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listLearnerCommunityMedia: {
    method: "GET",
    path: "/v1/learner/community-media",
    query: learnerCommunityMediaListQuerySchema,
    responses: {
      200: z.object({ items: z.array(mediaSchema), nextCursor: z.string().nullable() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
    },
  },
  toggleLearnerCommunityReaction: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/reactions",
    pathParams: z.object({ communityId: z.string() }),
    body: communityReactionBodySchema,
    responses: {
      200: z.object({
        active: z.boolean(),
        emoji: z.string(),
        entityId: z.string(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  toggleLearnerCommunityPostSubscription: {
    method: "POST",
    path: "/v1/learner/community-posts/:postId/subscription",
    pathParams: z.object({ postId: z.string() }),
    body: communitySubscriptionBodySchema,
    responses: {
      200: z.object({ subscribed: z.boolean() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerCommunityReport: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/reports",
    pathParams: z.object({ communityId: z.string() }),
    body: createCommunityReportBodySchema,
    responses: {
      201: communityReportSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listLearnerNotifications: {
    method: "GET",
    path: "/v1/learner/notifications",
    query: notificationListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(notificationSchema),
        nextCursor: z.string().nullable(),
      }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listLearnerNotificationPreferences: {
    method: "GET",
    path: "/v1/learner/notification-preferences",
    responses: {
      200: z.object({ items: z.array(notificationPreferenceSchema) }),
      401: platformErrorSchema,
    },
  },
  updateLearnerNotificationPreference: {
    method: "PATCH",
    path: "/v1/learner/notification-preferences/:type",
    pathParams: z.object({ type: notificationPreferenceTypeSchema }),
    body: updateNotificationPreferenceBodySchema,
    responses: {
      200: notificationPreferenceSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
    },
  },
  markLearnerNotificationRead: {
    method: "PATCH",
    path: "/v1/learner/notifications/:notificationId/read",
    pathParams: z.object({ notificationId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: notificationSchema,
      401: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  markAllLearnerNotificationsRead: {
    method: "POST",
    path: "/v1/learner/notifications/read-all",
    body: z.object({}).default({}),
    responses: {
      200: z.object({ updated: z.boolean() }),
      401: platformErrorSchema,
    },
  },
  listLearnerProducts: {
    method: "GET",
    path: "/v1/learner/products",
    responses: {
      200: z.object({ items: z.array(learnerProductSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listDiscussionReports: {
    method: "GET",
    path: "/v1/products/:productId/discussions/reports",
    pathParams: z.object({ productId: z.string() }),
    query: communityStatusQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionReportSchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateDiscussionReport: {
    method: "PATCH",
    path: "/v1/product-discussion-reports/:reportId",
    pathParams: z.object({ reportId: z.string() }),
    body: updateDiscussionReportBodySchema,
    responses: {
      200: discussionReportSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerDiscussionComments: {
    method: "GET",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionCommentSchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
        summary: discussionSummarySchema,
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPreviewDiscussionComments: {
    method: "GET",
    path: "/v1/preview/products/:productId/lessons/:lessonId/discussions",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    headers: z.object({ "x-preview-token": z.string().min(1) }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionCommentSchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
        summary: discussionSummarySchema,
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPreviewDiscussionSummaries: {
    method: "GET",
    path: "/v1/preview/products/:productId/discussions",
    pathParams: z.object({ productId: z.string() }),
    headers: z.object({ "x-preview-token": z.string().min(1) }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionSummarySchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPreviewDiscussionReplies: {
    method: "GET",
    path: "/v1/preview/products/:productId/lessons/:lessonId/discussions/comments/:commentId/replies",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      commentId: z.string(),
    }),
    headers: z.object({ "x-preview-token": z.string().min(1) }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionReplySchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerDiscussionSummaries: {
    method: "GET",
    path: "/v1/learner/products/:productId/discussions",
    pathParams: z.object({ productId: z.string() }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionSummarySchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerDiscussionComment: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: createDiscussionCommentBodySchema,
    responses: {
      201: discussionCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateLearnerDiscussionComment: {
    method: "PATCH",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/comments/:commentId",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      commentId: z.string(),
    }),
    body: createDiscussionCommentBodySchema,
    responses: {
      200: discussionCommentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteLearnerDiscussionComment: {
    method: "DELETE",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/comments/:commentId",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      commentId: z.string(),
    }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerDiscussionReplies: {
    method: "GET",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/comments/:commentId/replies",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      commentId: z.string(),
    }),
    query: discussionListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(discussionReplySchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerDiscussionReply: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/comments/:commentId/replies",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      commentId: z.string(),
    }),
    body: createDiscussionReplyBodySchema,
    responses: {
      201: discussionReplySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateLearnerDiscussionReply: {
    method: "PATCH",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/replies/:replyId",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      replyId: z.string(),
    }),
    body: createDiscussionCommentBodySchema,
    responses: {
      200: discussionReplySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteLearnerDiscussionReply: {
    method: "DELETE",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/replies/:replyId",
    pathParams: z.object({
      productId: z.string(),
      lessonId: z.string(),
      replyId: z.string(),
    }),
    responses: {
      200: z.object({ id: z.string() }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  toggleLearnerDiscussionLike: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/likes",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: discussionLikeBodySchema,
    responses: {
      200: z.object({
        contentType: z.enum(["comment", "reply"]),
        contentId: z.string(),
        active: z.boolean(),
        likesCount: z.number().int().nonnegative(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  toggleLearnerDiscussionSubscription: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/subscription",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: discussionSubscriptionBodySchema,
    responses: {
      200: z.object({ active: z.boolean() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLearnerDiscussionReport: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/discussions/reports",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: createDiscussionReportBodySchema,
    responses: {
      201: discussionReportSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  joinLearnerCommunity: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/join",
    pathParams: z.object({ communityId: z.string() }),
    body: joinCommunityBodySchema,
    responses: {
      200: communityMembershipSchema,
      201: communityMembershipSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  leaveLearnerCommunity: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/leave",
    pathParams: z.object({ communityId: z.string() }),
    body: leaveCommunityBodySchema,
    responses: {
      200: leaveCommunityResponseSchema,
      401: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listLearnerCommunityPlans: {
    method: "GET",
    path: "/v1/learner/communities/:communityId/plans",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: z.object({ items: z.array(communityPaymentPlanSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  startLearnerCommunityCheckout: {
    method: "POST",
    path: "/v1/learner/communities/:communityId/checkout",
    pathParams: z.object({ communityId: z.string() }),
    body: createLearnerCommunityCheckoutBodySchema,
    responses: {
      201: communityCheckoutSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  getLearnerCommunityCheckout: {
    method: "GET",
    path: "/v1/learner/community-checkouts/:checkoutId",
    pathParams: z.object({ checkoutId: z.string() }),
    responses: {
      200: communityCheckoutSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listProducts: {
    method: "GET",
    path: "/v1/products",
    query: listProductsQuerySchema,
    responses: {
      200: z.object({
        items: z.array(productListItemSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listPublicProducts: {
    method: "GET",
    path: "/v1/public/products",
    query: listProductsQuerySchema,
    responses: {
      200: z.object({
        items: z.array(publicProductListItemSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createCheckoutSession: {
    method: "POST",
    path: "/v1/storefront/checkout-sessions",
    body: createCheckoutSessionBodySchema,
    responses: {
      201: storefrontCheckoutSessionSchema,
      400: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getCheckoutSession: {
    method: "GET",
    path: "/v1/storefront/checkout-sessions/:sessionId",
    pathParams: z.object({ sessionId: z.string() }),
    responses: {
      200: storefrontCheckoutSessionSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPublicCommunities: {
    method: "GET",
    path: "/v1/public/communities",
    query: communityListQuerySchema,
    responses: {
      200: z.object({
        items: z.array(communitySchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  getPublicCommunity: {
    method: "GET",
    path: "/v1/public/communities/:communityId",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: communitySchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPublicCommunityPlans: {
    method: "GET",
    path: "/v1/public/communities/:communityId/plans",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: z.object({ items: z.array(communityPaymentPlanSchema) }),
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getPublicSiteSettings: {
    method: "GET",
    path: "/v1/public/site/settings",
    responses: {
      200: publicSiteSettingsSchema,
      403: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  getPublicSitePage: {
    method: "GET",
    path: "/v1/public/site/pages",
    query: z.object({ slug: z.string().max(200).default("") }),
    responses: {
      200: publicSitePageSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  listPublicSiteBlogs: {
    method: "GET",
    path: "/v1/public/site/blogs",
    responses: {
      200: z.object({ items: z.array(publicSiteBlogSchema), total: z.number().int() }),
      403: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  getPublicSiteBlog: {
    method: "GET",
    path: "/v1/public/site/blogs/:slug",
    pathParams: z.object({ slug: z.string().min(1).max(200) }),
    responses: {
      200: publicSiteBlogSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  listLearners: {
    method: "GET",
    path: "/v1/learners",
    query: listLearnersQuerySchema,
    responses: {
      200: z.object({
        items: z.array(adminLearnerSchema),
        nextCursor: z.string().nullable(),
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createLearnerIdentityLink: {
    method: "POST",
    path: "/v1/learners/identity-link",
    body: z.object({}).default({}),
    responses: {
      201: learnerIdentityLinkSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  updateLearner: {
    method: "PATCH",
    path: "/v1/learners/:learnerId",
    pathParams: z.object({ learnerId: z.string() }),
    body: updateLearnerBodySchema,
    responses: {
      200: adminLearnerSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createProduct: {
    method: "POST",
    path: "/v1/products",
    body: createProductBodySchema,
    responses: {
      201: productSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  updateProduct: {
    method: "PATCH",
    path: "/v1/products/:productId",
    pathParams: z.object({ productId: z.string() }),
    body: updateProductBodySchema,
    responses: {
      200: productSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getProductCertificateTemplate: {
    method: "GET",
    path: "/v1/products/:productId/certificate-template",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: productCertificateTemplateSchema.nullable(),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  upsertProductCertificateTemplate: {
    method: "PUT",
    path: "/v1/products/:productId/certificate-template",
    pathParams: z.object({ productId: z.string() }),
    body: upsertProductCertificateTemplateBodySchema,
    responses: {
      200: productCertificateTemplateSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteProduct: {
    method: "DELETE",
    path: "/v1/products/:productId",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPlans: {
    method: "GET",
    path: "/v1/products/:productId/plans",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: z.object({ items: z.array(storefrontPlanSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listPublicPlans: {
    method: "GET",
    path: "/v1/storefront/products/:productId/plans",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: z.object({ items: z.array(storefrontPlanSchema) }),
      400: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createPlan: {
    method: "POST",
    path: "/v1/products/:productId/plans",
    pathParams: z.object({ productId: z.string() }),
    body: createStorefrontPlanBodySchema,
    responses: {
      201: storefrontPlanSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  updatePlan: {
    method: "PATCH",
    path: "/v1/plans/:planId",
    pathParams: z.object({ planId: z.string() }),
    body: updateStorefrontPlanBodySchema,
    responses: {
      200: storefrontPlanSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  setDefaultPlan: {
    method: "POST",
    path: "/v1/plans/:planId/default",
    pathParams: z.object({ planId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: storefrontPlanSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  archivePlan: {
    method: "POST",
    path: "/v1/plans/:planId/archive",
    pathParams: z.object({ planId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: storefrontPlanSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listCommunityPlans: {
    method: "GET",
    path: "/v1/communities/:communityId/plans",
    pathParams: z.object({ communityId: z.string() }),
    responses: {
      200: z.object({ items: z.array(communityPaymentPlanSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createCommunityPlan: {
    method: "POST",
    path: "/v1/communities/:communityId/plans",
    pathParams: z.object({ communityId: z.string() }),
    body: createCommunityPaymentPlanBodySchema,
    responses: {
      201: communityPaymentPlanSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  updateCommunityPlan: {
    method: "PATCH",
    path: "/v1/community-plans/:planId",
    pathParams: z.object({ planId: z.string() }),
    body: updateCommunityPaymentPlanBodySchema,
    responses: {
      200: communityPaymentPlanSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  setDefaultCommunityPlan: {
    method: "POST",
    path: "/v1/community-plans/:planId/default",
    pathParams: z.object({ planId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: communityPaymentPlanSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  archiveCommunityPlan: {
    method: "POST",
    path: "/v1/community-plans/:planId/archive",
    pathParams: z.object({ planId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: communityPaymentPlanSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  getProduct: {
    method: "GET",
    path: "/v1/products/:productId",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: productDetailSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getProductAnalytics: {
    method: "GET",
    path: "/v1/products/:productId/analytics",
    pathParams: z.object({ productId: z.string() }),
    query: z.object({ range: productAnalyticsRangeSchema.default("7d") }),
    responses: {
      200: productAnalyticsSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getSchoolOverview: {
    method: "GET",
    path: "/v1/school/overview",
    query: z.object({ range: activityRangeSchema.default("7d") }),
    responses: {
      200: schoolOverviewSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createPreviewGrant: {
    method: "POST",
    path: "/v1/products/:productId/preview",
    pathParams: z.object({ productId: z.string() }),
    body: createPreviewGrantBodySchema,
    responses: {
      201: previewGrantSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  readPreviewProduct: {
    method: "GET",
    path: "/v1/preview/products/:productId",
    pathParams: z.object({ productId: z.string() }),
    headers: z.object({ "x-preview-token": z.string().min(1) }),
    responses: {
      200: productDetailSchema,
      401: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getLearnerLessonMedia: {
    method: "GET",
    path: "/v1/products/:productId/lessons/:lessonId/media",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    responses: {
      200: learnerLessonMediaSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getPreviewLessonMedia: {
    method: "GET",
    path: "/v1/preview/products/:productId/lessons/:lessonId/media",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    headers: z.object({ "x-preview-token": z.string().min(1) }),
    responses: {
      200: learnerLessonMediaSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getLearnerScormRuntime: {
    method: "GET",
    path: "/v1/learner/products/:productId/lessons/:lessonId/scorm/runtime",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    responses: {
      200: scormRuntimeStateSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateLearnerScormRuntime: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/scorm/runtime",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: scormRuntimeUpdateBodySchema,
    responses: {
      200: scormRuntimeStateSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  processScormPackage: {
    method: "POST",
    path: "/v1/lessons/:lessonId/scorm/process",
    pathParams: z.object({ lessonId: z.string() }),
    body: processScormPackageBodySchema,
    responses: {
      200: z.object({
        success: z.literal(true),
        packageInfo: scormPackageInfoSchema,
      }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  evaluateLearnerQuiz: {
    method: "POST",
    path: "/v1/learner/products/:productId/lessons/:lessonId/evaluation",
    pathParams: z.object({ productId: z.string(), lessonId: z.string() }),
    body: evaluateQuizBodySchema,
    responses: {
      200: quizEvaluationSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createLesson: {
    method: "POST",
    path: "/v1/products/:productId/lessons",
    pathParams: z.object({ productId: z.string() }),
    body: createLessonBodySchema,
    responses: {
      201: lessonSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listSections: {
    method: "GET",
    path: "/v1/products/:productId/sections",
    pathParams: z.object({ productId: z.string() }),
    responses: {
      200: z.object({ items: z.array(sectionSchema) }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createSection: {
    method: "POST",
    path: "/v1/products/:productId/sections",
    pathParams: z.object({ productId: z.string() }),
    body: createSectionBodySchema,
    responses: {
      201: sectionSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  reorderSections: {
    method: "POST",
    path: "/v1/products/:productId/sections/reorder",
    pathParams: z.object({ productId: z.string() }),
    body: reorderSectionsBodySchema,
    responses: {
      200: z.object({ items: z.array(sectionSchema) }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  reorderLessons: {
    method: "POST",
    path: "/v1/products/:productId/lessons/reorder",
    pathParams: z.object({ productId: z.string() }),
    body: reorderLessonsBodySchema,
    responses: {
      200: z.object({ items: z.array(lessonSchema) }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateLesson: {
    method: "PATCH",
    path: "/v1/lessons/:lessonId",
    pathParams: z.object({ lessonId: z.string() }),
    body: updateLessonBodySchema,
    responses: {
      200: lessonSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteLesson: {
    method: "DELETE",
    path: "/v1/lessons/:lessonId",
    pathParams: z.object({ lessonId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateSection: {
    method: "PATCH",
    path: "/v1/sections/:sectionId",
    pathParams: z.object({ sectionId: z.string() }),
    body: updateSectionBodySchema,
    responses: {
      200: sectionSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteSection: {
    method: "DELETE",
    path: "/v1/sections/:sectionId",
    pathParams: z.object({ sectionId: z.string() }),
    responses: {
      200: z.object({ id: z.string() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  authorizeMediaUpload: {
    method: "POST",
    path: "/v1/media/upload-authorizations",
    body: authorizeMediaUploadBodySchema,
    responses: {
      201: mediaUploadAuthorizationSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  finalizeMediaUpload: {
    method: "POST",
    path: "/v1/media",
    body: finalizeMediaUploadBodySchema,
    responses: {
      201: mediaSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listMedia: {
    method: "GET",
    path: "/v1/media",
    query: z.object({
      search: z.string().max(200).optional(),
      cursor: z.string().max(500).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(25),
    }),
    responses: {
      200: z.object({ items: z.array(mediaSchema), nextCursor: z.string().nullable() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  searchUnsplash: {
    method: "GET",
    path: "/v1/media/unsplash",
    query: searchUnsplashQuerySchema,
    responses: {
      200: searchUnsplashResponseSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      502: platformErrorSchema,
    },
  },
  getMedia: {
    method: "GET",
    path: "/v1/media/:mediaId",
    pathParams: z.object({ mediaId: z.string() }),
    responses: {
      200: mediaSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateMedia: {
    method: "PATCH",
    path: "/v1/media/:mediaId",
    pathParams: z.object({ mediaId: z.string() }),
    body: updateMediaBodySchema,
    responses: {
      200: mediaSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  deleteMedia: {
    method: "DELETE",
    path: "/v1/media/:mediaId",
    pathParams: z.object({ mediaId: z.string() }),
    responses: {
      204: z.undefined(),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  listMediaReferences: {
    method: "GET",
    path: "/v1/media/:mediaId/references",
    pathParams: z.object({ mediaId: z.string() }),
    responses: {
      200: z.object({ items: z.array(mediaReferenceSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  reconcileMediaReferences: {
    method: "PUT",
    path: "/v1/media/:mediaId/references",
    pathParams: z.object({ mediaId: z.string() }),
    body: reconcileMediaReferencesBodySchema,
    responses: {
      200: z.object({ items: z.array(mediaReferenceSchema) }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  grantEnrollment: {
    method: "POST",
    path: "/v1/enrollments",
    body: z.object({
      productId: z.string().min(1),
      email: z.string().email(),
      name: z.string().min(1).max(200).default("Learner"),
    }),
    responses: {
      201: enrollmentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  learnerSignUp: {
    method: "POST",
    path: "/v1/learner/auth/sign-up",
    body: learnerAuthBodySchema.extend({
      name: z.string().min(1).max(200),
    }),
    responses: {
      201: learnerSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  learnerRequestOtp: {
    method: "POST",
    path: "/v1/learner/auth/request-otp",
    body: learnerOtpRequestBodySchema,
    responses: {
      202: learnerOtpRequestResponseSchema,
      400: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  learnerVerifyOtp: {
    method: "POST",
    path: "/v1/learner/auth/verify-otp",
    body: learnerOtpVerifyBodySchema,
    responses: {
      200: learnerSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  learnerSignIn: {
    method: "POST",
    path: "/v1/learner/auth/sign-in",
    body: learnerAuthBodySchema,
    responses: {
      200: learnerSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  learnerSignOut: {
    method: "POST",
    path: "/v1/learner/auth/sign-out",
    body: z.object({}).default({}),
    responses: {
      204: z.undefined(),
      401: platformErrorSchema,
    },
  },
  learnerMe: {
    method: "GET",
    path: "/v1/learner/me",
    responses: {
      200: learnerSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  learnerEnroll: {
    method: "POST",
    path: "/v1/learner/enrollments",
    body: z.object({ productId: z.string().min(1) }),
    responses: {
      201: enrollmentSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  learnerCreateDownloadLink: {
    method: "POST",
    path: "/v1/learner/products/:productId/download",
    pathParams: z.object({ productId: z.string() }),
    body: createLearnerDownloadLinkBodySchema,
    responses: {
      201: learnerDownloadLinkSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  learnerCheckout: {
    method: "POST",
    path: "/v1/learner/checkout",
    body: createLearnerCheckoutBodySchema,
    responses: {
      200: storefrontCheckoutSchema,
      201: storefrontCheckoutSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  startLearnerCheckoutSession: {
    method: "POST",
    path: "/v1/learner/checkout-sessions/:sessionId/checkout",
    pathParams: z.object({ sessionId: z.string() }),
    body: startCheckoutSessionBodySchema,
    responses: {
      200: storefrontCheckoutSchema,
      201: storefrontCheckoutSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  getLearnerCheckout: {
    method: "GET",
    path: "/v1/learner/checkouts/:checkoutId",
    pathParams: z.object({ checkoutId: z.string() }),
    responses: {
      200: storefrontCheckoutSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  learnerCompleteLesson: {
    method: "POST",
    path: "/v1/learner/lessons/:lessonId/complete",
    pathParams: z.object({ lessonId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: progressSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  learnerStartLesson: {
    method: "POST",
    path: "/v1/learner/lessons/:lessonId/start",
    pathParams: z.object({ lessonId: z.string() }),
    body: z.object({}).default({}),
    responses: {
      200: lessonProgressSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  stripeWebhook: {
    method: "POST",
    path: "/v1/storefront/webhooks/stripe",
    body: z.unknown(),
    responses: { 200: paymentWebhookResponseSchema, 400: platformErrorSchema, 401: platformErrorSchema, 409: platformErrorSchema },
  },
  lemonSqueezyWebhook: {
    method: "POST",
    path: "/v1/storefront/webhooks/lemonsqueezy",
    body: z.unknown(),
    responses: { 200: paymentWebhookResponseSchema, 400: platformErrorSchema, 401: platformErrorSchema, 409: platformErrorSchema },
  },
  razorpayWebhook: {
    method: "POST",
    path: "/v1/storefront/webhooks/razorpay",
    body: z.unknown(),
    responses: { 200: paymentWebhookResponseSchema, 400: platformErrorSchema, 401: platformErrorSchema, 409: platformErrorSchema },
  },
  listLearnerProgress: {
    method: "GET",
    path: "/v1/learner/progress",
    query: listLearnerProgressQuerySchema,
    responses: {
      200: z.object({ items: z.array(lessonProgressSchema) }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listLearnerCertificates: {
    method: "GET",
    path: "/v1/learner/certificates",
    responses: {
      200: z.object({ items: z.array(certificateSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  verifyCertificate: {
    method: "GET",
    path: "/v1/certificates/:verificationId",
    pathParams: z.object({ verificationId: z.string() }),
    responses: {
      200: certificateVerificationSchema,
      404: platformErrorSchema,
    },
  },
  listCertificateTemplates: {
    method: "GET",
    path: "/v1/certificate-templates",
    responses: {
      200: z.object({ items: z.array(certificateTemplateSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createCertificateTemplate: {
    method: "POST",
    path: "/v1/certificate-templates",
    body: createCertificateTemplateBodySchema,
    responses: {
      201: certificateTemplateSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  updateCertificateTemplate: {
    method: "PATCH",
    path: "/v1/certificate-templates/:templateId",
    pathParams: z.object({ templateId: z.string() }),
    body: updateCertificateTemplateBodySchema,
    responses: {
      200: certificateTemplateSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  getBillingCatalog: {
    method: "GET",
    path: "/v1/billing/catalog",
    responses: {
      200: billingCatalogSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  getEntitlement: {
    method: "GET",
    path: "/v1/billing/entitlement",
    responses: {
      200: entitlementSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listSchools: {
    method: "GET",
    path: "/v1/schools",
    responses: {
      200: z.object({ items: z.array(schoolSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  getSchoolPaymentSettings: {
    method: "GET",
    path: "/v1/school/payment-settings",
    responses: {
      200: schoolPaymentSettingsSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateSchoolPaymentSettings: {
    method: "PATCH",
    path: "/v1/school/payment-settings",
    body: updateSchoolPaymentSettingsBodySchema,
    responses: {
      200: schoolPaymentSettingsSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  getSchoolCodeInjection: {
    method: "GET",
    path: "/v1/school/code-injection",
    responses: {
      200: schoolCodeInjectionSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  updateSchoolCodeInjection: {
    method: "PATCH",
    path: "/v1/school/code-injection",
    body: updateSchoolCodeInjectionBodySchema,
    responses: {
      200: schoolCodeInjectionSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listSchoolFrontLitPages: {
    method: "GET",
    path: "/v1/school/frontlit/pages",
    responses: {
      200: z.object({ items: z.array(frontlitContentSummarySchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  createSchoolFrontLitPage: {
    method: "POST",
    path: "/v1/school/frontlit/pages",
    body: createSchoolFrontLitPageBodySchema,
    responses: {
      201: frontlitContentSummarySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  getSchoolFrontLitPage: {
    method: "GET",
    path: "/v1/school/frontlit/pages/:pageId",
    pathParams: z.object({ pageId: z.string().min(1) }),
    responses: {
      200: frontlitPageSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  updateSchoolFrontLitPage: {
    method: "PATCH",
    path: "/v1/school/frontlit/pages/:pageId",
    pathParams: z.object({ pageId: z.string().min(1) }),
    body: updateSchoolFrontLitPageBodySchema,
    responses: {
      200: frontlitPageSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  getSchoolFrontLitSettings: {
    method: "GET",
    path: "/v1/school/frontlit/settings",
    responses: {
      200: frontlitSettingsSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  updateSchoolFrontLitSettings: {
    method: "PATCH",
    path: "/v1/school/frontlit/settings",
    body: updateSchoolFrontLitSettingsBodySchema,
    responses: {
      200: frontlitSettingsSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  listSchoolFrontLitThemes: {
    method: "GET",
    path: "/v1/school/frontlit/themes",
    responses: {
      200: z.object({ items: z.array(frontlitThemeSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  createSchoolFrontLitTheme: {
    method: "POST",
    path: "/v1/school/frontlit/themes",
    body: createSchoolFrontLitThemeBodySchema,
    responses: {
      201: frontlitThemeSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  updateSchoolFrontLitTheme: {
    method: "PATCH",
    path: "/v1/school/frontlit/themes/:themeId",
    pathParams: z.object({ themeId: z.string().min(1) }),
    body: updateSchoolFrontLitThemeBodySchema,
    responses: {
      200: frontlitThemeSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  publishSchoolFrontLitPage: {
    method: "POST",
    path: "/v1/school/frontlit/pages/:pageId/publish",
    pathParams: z.object({ pageId: z.string().min(1) }),
    body: c.noBody(),
    responses: {
      200: frontlitContentSummarySchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  discardSchoolFrontLitPage: {
    method: "POST",
    path: "/v1/school/frontlit/pages/:pageId/discard-draft",
    pathParams: z.object({ pageId: z.string().min(1) }),
    body: c.noBody(),
    responses: {
      200: frontlitPageSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  publishSchoolFrontLitBlog: {
    method: "POST",
    path: "/v1/school/frontlit/blogs/:blogId/publish",
    pathParams: z.object({ blogId: z.string().min(1) }),
    body: c.noBody(),
    responses: {
      200: frontlitContentSummarySchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  listSchoolFrontLitBlogs: {
    method: "GET",
    path: "/v1/school/frontlit/blogs",
    responses: {
      200: z.object({ items: z.array(frontlitContentSummarySchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  createSchoolFrontLitBlog: {
    method: "POST",
    path: "/v1/school/frontlit/blogs",
    body: createSchoolFrontLitBlogBodySchema,
    responses: {
      201: frontlitContentSummarySchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  getSchoolFrontLitBlog: {
    method: "GET",
    path: "/v1/school/frontlit/blogs/:blogId",
    pathParams: z.object({ blogId: z.string().min(1) }),
    responses: {
      200: frontlitBlogSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  updateSchoolFrontLitBlog: {
    method: "PATCH",
    path: "/v1/school/frontlit/blogs/:blogId",
    pathParams: z.object({ blogId: z.string().min(1) }),
    body: updateSchoolFrontLitBlogBodySchema,
    responses: {
      200: frontlitBlogSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  discardSchoolFrontLitBlog: {
    method: "POST",
    path: "/v1/school/frontlit/blogs/:blogId/discard-draft",
    pathParams: z.object({ blogId: z.string().min(1) }),
    body: c.noBody(),
    responses: {
      200: frontlitBlogSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
      500: platformErrorSchema,
    },
  },
  updateSchool: {
    method: "PATCH",
    path: "/v1/schools/:schoolId",
    pathParams: z.object({ schoolId: z.string().min(1) }),
    body: updateSchoolBodySchema,
    responses: {
      200: schoolSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  listSchoolHosts: {
    method: "GET",
    path: "/v1/school/hosts",
    responses: {
      200: z.object({ items: z.array(schoolHostSchema) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createSchoolHost: {
    method: "POST",
    path: "/v1/school/hosts",
    body: createSchoolHostBodySchema,
    responses: {
      201: createSchoolHostResponseSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  verifySchoolHost: {
    method: "POST",
    path: "/v1/school/hosts/:hostname/verify",
    pathParams: z.object({ hostname: z.string().min(1) }),
    body: verifySchoolHostBodySchema,
    responses: {
      200: schoolHostSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  deleteSchoolHost: {
    method: "DELETE",
    path: "/v1/school/hosts/:hostname",
    pathParams: z.object({ hostname: z.string().min(1) }),
    responses: {
      204: z.undefined(),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
      409: platformErrorSchema,
    },
  },
  createSchool: {
    method: "POST",
    path: "/v1/schools",
    body: createSchoolBodySchema,
    responses: {
      201: createSchoolResponseSchema,
      409: platformErrorSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
    },
  },
  selectSchool: {
    method: "POST",
    path: "/api/school/select",
    body: z.object({ schoolId: z.string().min(1) }),
    responses: {
      204: z.undefined(),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  listApiKeys: {
    method: "GET",
    path: "/v1/api-keys",
    responses: {
      200: z.object({ items: z.array(apiKeySchema.omit({ raw: true })) }),
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  createApiKey: {
    method: "POST",
    path: "/v1/api-keys",
    body: z.object({
      permissions: z.array(z.string()).default([]),
      expiresAt: z.iso.datetime().optional(),
    }),
    responses: {
      201: apiKeySchema.required({ raw: true }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  revokeApiKey: {
    method: "DELETE",
    path: "/v1/api-keys/:publicId",
    pathParams: z.object({ publicId: z.string() }),
    responses: {
      204: z.undefined(),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  createInvitation: {
    method: "POST",
    path: "/v1/invitations",
    body: z.object({
      email: z.string().email(),
      role: z.string().min(1),
      permissions: z.array(z.string()).default([]),
    }),
    responses: {
      201: invitationSchema,
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
    },
  },
  acceptInvitation: {
    method: "POST",
    path: "/v1/invitations/accept",
    body: z.object({ token: z.string().min(1), email: z.string().email() }),
    responses: {
      200: z.object({ ok: z.literal(true), schoolId: z.string() }),
      400: platformErrorSchema,
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
  revokeInvitation: {
    method: "DELETE",
    path: "/v1/invitations/:invitationId",
    pathParams: z.object({ invitationId: z.string() }),
    responses: {
      204: z.undefined(),
      401: platformErrorSchema,
      403: platformErrorSchema,
      404: platformErrorSchema,
    },
  },
});

export type Contract = typeof contract;
export { mcpParityManifest } from "./mcp-parity.js";
