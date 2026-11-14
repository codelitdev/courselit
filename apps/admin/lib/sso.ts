import type {
  schoolLoginMethodsSchema,
  ssoConnectionSchema,
  ssoConnectionTestResultSchema,
  ssoDomainSchema,
} from "@courselit/api-contract";

export type SsoConnection = (typeof ssoConnectionSchema)["_output"];
export type SsoDomain = (typeof ssoDomainSchema)["_output"];
export type SsoTestResult = (typeof ssoConnectionTestResultSchema)["_output"];
export type SchoolLoginMethods = (typeof schoolLoginMethodsSchema)["_output"];
export type LoginMethod = "email" | "google";

/** The query parameter the API adds when it sends the admin back from a test sign-in. */
export const SSO_TEST_QUERY_PARAM = "ssoTest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The test request id the API put on the return URL, or null. */
export function parseSsoTestReturn(search: string): string | null {
  const value = new URLSearchParams(search).get(SSO_TEST_QUERY_PARAM);
  return value && UUID.test(value) ? value : null;
}

/** The reason code in a platform error body, if any. */
export function errorReason(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const details = (body as { details?: Record<string, unknown> }).details;
  const reason = details?.reason;
  return typeof reason === "string" ? reason : null;
}

export const RECENT_AUTHENTICATION_REASON = "recent_authentication_required";

const REASON_MESSAGES: Record<string, string> = {
  plan_required: "Your plan doesn't include single sign-on yet.",
  connection_suspended: "This connection was paused because the plan changed. It comes back when the plan does.",
  connection_not_testable: "This connection can't be tested right now.",
  incomplete_configuration: "Add the sign-in URL and a certificate first.",
  not_tested: "Test the connection with the current settings first.",
  no_verified_domain: "Verify at least one domain first.",
  another_connection_active: "Another connection is already on. Turn it off first.",
  too_many_connections: "This school has reached the maximum number of connections.",
  too_many_domains: "This connection has reached the maximum number of domains.",
  domain_already_added: "That domain is already on this connection.",
  invalid_domain: "Enter a domain like example.com.",
  invalid_certificate: "One of the certificates isn't valid. Paste each one in PEM format.",
  unsafe_sso_url: "The sign-in URL must start with https://.",
  idp_entity_id_required: "Paste the provider's metadata, or enter its entity ID.",
  idp_entity_id_immutable:
    "This metadata is for a different provider. The entity ID can't change. Delete this connection and create a new one instead.",
  return_url_not_allowed: "The test couldn't return to this page.",
};

/** A short, plain message for an API error. */
export function ssoErrorMessage(body: unknown, fallback: string): string {
  const reason = errorReason(body);
  if (reason) {
    if (REASON_MESSAGES[reason]) return REASON_MESSAGES[reason];
    if (reason.startsWith("metadata_")) {
      return "That metadata couldn't be read. Paste the full XML your provider gave you.";
    }
  }
  return fallback;
}

export type SsoStatusKind = "active" | "draft" | "suspended" | "disabled" | "not_set_up";

export function ssoStatusKind(connection: Pick<SsoConnection, "status"> | null | undefined): SsoStatusKind {
  return connection ? connection.status : "not_set_up";
}

export const SSO_STATUS_LABELS: Record<SsoStatusKind, string> = {
  active: "On",
  draft: "Draft",
  suspended: "Paused",
  disabled: "Off",
  not_set_up: "Not set up",
};

/** The connection to show on the sign-in methods list: an active one first, else the newest. */
export function primarySsoConnection(items: readonly SsoConnection[]): SsoConnection | null {
  return items.find((item) => item.status === "active") ?? items[items.length - 1] ?? null;
}

/**
 * Whether a test sign-in can start, and if not, a note for the admin (null
 * when the reason is already shown elsewhere, like unsaved changes). The API
 * tests only draft and active connections; changing a turned-off
 * connection's provider settings makes it a draft again.
 */
export function testAvailability(
  connection: Pick<SsoConnection, "status" | "idpSsoUrl" | "idpCertificates">,
  options: { readOnly: boolean; dirty: boolean },
): { canTest: boolean; note: string | null } {
  if (options.readOnly || options.dirty) return { canTest: false, note: null };
  if (!connection.idpSsoUrl || connection.idpCertificates.length === 0) {
    return { canTest: false, note: "Add the sign-in URL and a certificate first." };
  }
  if (connection.status === "suspended") {
    return { canTest: false, note: "Single sign-on is paused because your plan doesn't include it." };
  }
  if (connection.status === "disabled") {
    return {
      canTest: false,
      note: "The connection is off. Turn it on with the settings it was tested with, or change its provider settings to test it again.",
    };
  }
  return { canTest: true, note: null };
}

const TEST_FAILURE_HINTS: Record<string, string> = {
  status_not_success:
    "Your provider refused the sign-in. Check that the person is assigned to the app in your provider.",
  signature_invalid:
    "Your provider has to sign the assertion itself, not only the response, with one of the certificates above. In Keycloak, turn on Sign assertions.",
  weak_algorithm: "Your provider signed with SHA-1. Set its signature algorithm to RSA-SHA256.",
  wrong_audience: "Your provider sent a different audience. Set its entity ID (audience) to the Entity ID in step 1.",
  wrong_recipient: "Your provider sent the response to another address. Set its ACS URL to the one in step 1.",
  wrong_destination: "Your provider sent the response to another address. Set its ACS URL to the one in step 1.",
  wrong_issuer: "The response came from a different provider than the entity ID saved here.",
  missing_subject: "Your provider didn't send a NameID. Set its NameID format to persistent.",
  unstable_subject:
    "Your provider's NameID isn't in the persistent format. Set its NameID format to persistent, or set a subject attribute.",
  expired: "The response had already expired. Check that your provider's clock is right.",
  not_yet_valid: "The response isn't valid yet. Check that your provider's clock is right.",
};

/** What to change after a failed test, for the reasons the admin can fix in the provider. */
export function testFailureHint(reason: string | null | undefined): string | null {
  return reason && Object.hasOwn(TEST_FAILURE_HINTS, reason) ? TEST_FAILURE_HINTS[reason]! : null;
}

export type ActivationBlocker =
  | "suspended"
  | "plan"
  | "incomplete"
  | "no_verified_domain"
  | "not_tested";

/**
 * Why Activate is unavailable, in the order the admin should fix things.
 * Empty when the connection can be turned on (or already is).
 */
export function activationBlockers(
  connection: SsoConnection,
  options: { billingAvailable: boolean },
): { code: ActivationBlocker; message: string }[] {
  if (connection.status === "active") return [];
  const blockers: { code: ActivationBlocker; message: string }[] = [];
  if (connection.status === "suspended") {
    blockers.push({
      code: "suspended",
      message: "Paused because the plan changed. It turns back on when the plan includes single sign-on again.",
    });
  } else if (!connection.planAvailable) {
    blockers.push({
      code: "plan",
      message: options.billingAvailable
        ? "Single sign-on is part of the Business plan."
        : "Single sign-on isn't available for this school.",
    });
  }
  if (!connection.idpSsoUrl || connection.idpCertificates.length === 0) {
    blockers.push({ code: "incomplete", message: "Add the provider's sign-in URL and a certificate." });
  }
  if (!connection.domains.some((domain) => domain.verified)) {
    blockers.push({ code: "no_verified_domain", message: "Verify at least one domain." });
  }
  if (!connection.testedAt) {
    blockers.push({ code: "not_tested", message: "Run a test sign-in." });
  } else if (!connection.testedCurrentConfiguration) {
    blockers.push({
      code: "not_tested",
      message: "The settings changed since the last test. Test the connection again.",
    });
  }
  return blockers;
}

/** Whether to offer the Business plan upgrade prompt: the plan lacks SSO and this school can upgrade. */
export function showUpgradePrompt(
  connection: Pick<SsoConnection, "planAvailable" | "status">,
  billingAvailable: boolean,
): boolean {
  return billingAvailable && !connection.planAvailable && connection.status !== "active";
}

/** What to publish at the DNS provider for a domain. */
export function txtRecordDisplay(domain: Pick<SsoDomain, "verificationRecord">): {
  type: string;
  name: string;
  value: string;
} {
  const { type, name, value } = domain.verificationRecord;
  return { type, name, value };
}

/** Plain text for a domain's state. */
export function domainStatus(domain: SsoDomain): { label: string; tone: "success" | "warning" | "neutral" } {
  if (domain.verified) {
    return domain.consecutiveCheckFailures > 0
      ? { label: "Verified, record not found on last check", tone: "warning" }
      : { label: "Verified", tone: "success" };
  }
  return { label: "Not verified", tone: "neutral" };
}

export type SsoFormValues = {
  displayName: string;
  idpSsoUrl: string;
  certificates: string;
  subjectAttribute: string;
  metadataXml: string;
  maxSessionMinutes: string;
};

/** Each PEM block (or bare base64 body) from the certificates box. */
export function splitCertificates(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const blocks = trimmed.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (blocks) return blocks.map((block) => block.trim());
  return trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formFromConnection(connection: SsoConnection): SsoFormValues {
  return {
    displayName: connection.displayName,
    idpSsoUrl: connection.idpSsoUrl ?? "",
    certificates: connection.idpCertificates.join("\n\n"),
    subjectAttribute: connection.subjectAttribute ?? "",
    metadataXml: "",
    maxSessionMinutes: connection.maxSessionMinutes ? String(connection.maxSessionMinutes) : "",
  };
}

const bare = (certificate: string) =>
  certificate.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");

/**
 * Whether saving these values changes what the connection trusts (sign-in URL,
 * certificates, subject attribute). On an active connection that puts it back
 * to draft and signs out its learners.
 */
export function changesTrust(connection: SsoConnection, values: SsoFormValues): boolean {
  if (values.metadataXml.trim()) return true;
  if (values.idpSsoUrl.trim() !== (connection.idpSsoUrl ?? "")) return true;
  if ((values.subjectAttribute.trim() || null) !== connection.subjectAttribute) return true;
  const current = connection.idpCertificates.map(bare).sort().join("|");
  const next = splitCertificates(values.certificates).map(bare).sort().join("|");
  return current !== next;
}

/** The body for updateSsoConnection: only what changed. */
export function buildUpdateBody(
  connection: SsoConnection,
  values: SsoFormValues,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (values.displayName.trim() !== connection.displayName) body.displayName = values.displayName.trim();
  if (values.metadataXml.trim()) {
    body.metadataXml = values.metadataXml.trim();
  } else {
    if (values.idpSsoUrl.trim() !== (connection.idpSsoUrl ?? "")) body.idpSsoUrl = values.idpSsoUrl.trim();
    const current = connection.idpCertificates.map(bare).sort().join("|");
    const certificates = splitCertificates(values.certificates);
    if (certificates.map(bare).sort().join("|") !== current) body.idpCertificates = certificates;
  }
  const subject = values.subjectAttribute.trim() || null;
  if (subject !== connection.subjectAttribute) body.subjectAttribute = subject;
  const minutes = values.maxSessionMinutes.trim() ? Number(values.maxSessionMinutes) : null;
  if (minutes !== connection.maxSessionMinutes) body.maxSessionMinutes = minutes;
  return body;
}

/** An error for the session length field, or null when it is empty or valid. */
export function sessionMinutesError(value: string): string | null {
  if (!value.trim()) return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 525_600) {
    return "Enter a whole number of minutes between 5 and 525600, or leave it empty.";
  }
  return null;
}

/**
 * Which sign-in methods turning one off would leave, so the page can refuse to
 * turn off the last usable one before the API does.
 */
export function methodsAfterToggle(
  methods: SchoolLoginMethods,
  method: LoginMethod,
  on: boolean,
): LoginMethod[] {
  const next = new Set<LoginMethod>(methods.loginMethods);
  if (on) next.add(method);
  else next.delete(method);
  return (["email", "google"] as const).filter((item) => next.has(item));
}

/** Whether turning `method` off would leave nothing usable (SSO counts when active). */
export function wouldLeaveNoMethod(methods: SchoolLoginMethods, method: LoginMethod): boolean {
  const remaining = methodsAfterToggle(methods, method, false);
  const googleUsable = methods.googleAvailable;
  const usable = remaining.filter((item) => item !== "google" || googleUsable);
  return usable.length === 0 && !methods.sso.active;
}

/** Test attributes, sorted by name, for display. */
export function sortedAttributes(attributes: Record<string, string[]>): [string, string[]][] {
  return Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b));
}
