export type SamlConnectionConfig = {
  /** Per-connection SP entity id (an https URL). */
  spEntityId: string;
  /** Per-connection assertion consumer service URL. */
  acsUrl: string;
  idpEntityId: string;
  /** Must pass `isSafeIdpUrl`. */
  idpSsoUrl: string;
  /** PEM or bare base64; at least one; several allowed for rotation. */
  idpCertificates: string[];
  /** Attribute to use as the subject when the NameID isn't persistent. */
  subjectAttribute?: string | null;
};

export interface SsoRequestStore {
  /** The open (unused, unexpired) request for this RelayState token, without using it up. */
  findOpen(relayState: string): Promise<{ requestId: string } | null>;
  /** Atomically use up the request iff still open and its AuthnRequest ID equals inResponseTo. */
  consume(relayState: string, inResponseTo: string): Promise<boolean>;
}

export interface AssertionReplayStore {
  /** Record an assertion ID until expiresAt; false if it was already recorded. */
  remember(assertionId: string, expiresAt: Date): Promise<boolean>;
}

export type SamlAssertion = {
  issuer: string;
  assertionId: string;
  subject: string;
  email: string | null;
  name: string | null;
  attributes: Record<string, string[]>;
  sessionNotOnOrAfter: Date | null;
};

export type SamlFailureReason =
  | "request_not_found"
  | "connection_unavailable"
  | "invalid_response"
  | "response_too_large"
  | "dtd_not_allowed"
  | "status_not_success"
  | "signature_invalid"
  | "weak_algorithm"
  | "wrong_audience"
  | "wrong_destination"
  | "wrong_recipient"
  | "wrong_issuer"
  | "expired"
  | "not_yet_valid"
  | "in_response_to_mismatch"
  | "request_already_used"
  | "replayed_assertion"
  | "unstable_subject"
  | "missing_subject";

export type SamlValidationResult =
  | { ok: true; assertion: SamlAssertion }
  | { ok: false; reason: SamlFailureReason };

export type SamlServiceProvider = {
  buildAuthnRequestUrl(input: {
    relayState: string;
  }): Promise<{ url: string; requestId: string }>;
  validatePostResponse(input: {
    samlResponse: string;
    relayState: string;
    requests: SsoRequestStore;
    replay: AssertionReplayStore;
    /** Called after the request is found and before signature validation; false => "connection_unavailable". */
    checkConnection?: () => Promise<boolean>;
  }): Promise<SamlValidationResult>;
  serviceProviderMetadata(): string;
};
