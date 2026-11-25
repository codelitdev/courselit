import type { Observability } from "@codelitdev/observability";
import type { Clock } from "@codelitdev/platform";
import type { AuthRuntime } from "./auth/authenticate.js";
import type { BillingBundle } from "./billing.js";
import type { GifClient } from "./gifs.js";
import type { LegacySchoolChecker } from "./legacy-schools.js";
import type { MediaLitClient } from "./media.js";
import type { PaymentProvider } from "./payments.js";
import type { DnsResolver } from "./school-hosts.js";
import type { SendLitConfig } from "./sendlit-client.js";
import type { UnsplashClient } from "./unsplash.js";

export type DispatchDeps = AuthRuntime & {
  clock: Clock;
  billing: BillingBundle;
  billingMode: "cloud" | "oss";
  mediaLit: MediaLitClient;
  unsplash: UnsplashClient;
  gifs: GifClient;
  serviceName: string;
  databaseReady: boolean;
  observability?: Observability;
  /** Optional in-memory provider used by API tests; production resolves this from school settings. */
  paymentProvider?: PaymentProvider;
  sendLit: SendLitConfig;
  /** Optional DNS stub used by API tests for custom domain verification. */
  dnsResolver?: DnsResolver;
  /**
   * Asks the classic CourseLit app whether one of its schools owns a hostname
   * (`LEGACY_SCHOOL_CHECK_URL`). Unset skips the check (self-hosted installs).
   */
  legacySchools?: LegacySchoolChecker;
};
