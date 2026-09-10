import type { Observability } from "@codelitdev/observability";
import type { Clock } from "@codelitdev/platform";
import type { AuthRuntime } from "./auth/authenticate.js";
import type { LearnerAuth } from "./auth/better-auth.js";
import type { BillingBundle } from "./billing.js";
import type { MediaLitClient } from "./media.js";
import type { PaymentProvider } from "./payments.js";
import type { UnsplashClient } from "./unsplash.js";

export type DispatchDeps = AuthRuntime & {
  learnerAuth: LearnerAuth;
  clock: Clock;
  billing: BillingBundle;
  billingMode: "cloud" | "oss";
  mediaLit: MediaLitClient;
  unsplash: UnsplashClient;
  serviceName: string;
  databaseReady: boolean;
  observability?: Observability;
  customDomainVerifier?: (hostname: string, token: string) => Promise<boolean>;
  /** Optional in-memory provider used by API tests; production resolves this from school settings. */
  paymentProvider?: PaymentProvider;
};
