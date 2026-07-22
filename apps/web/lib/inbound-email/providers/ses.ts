import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import { type KeyObject, verify, X509Certificate } from "node:crypto";
import { InboundEmailError } from "../errors";
import {
    parseEmailAddress,
    parseEmailAddresses,
    parseJsonBody,
    parseMessageId,
    timingSafeEqualStrings,
} from "../provider-utils";
import type {
    InboundEmailAdapter,
    InboundEmailRequest,
    NormalizedInboundEmail,
    ParsedInboundEmail,
} from "../types";

const MAX_SNS_SIGNING_CERTIFICATE_BYTES = 64 * 1024;
const MAX_SES_S3_EMAIL_BYTES = 40 * 1024 * 1024;
const textEncoder = new TextEncoder();

type SnsMessageType =
    | "Notification"
    | "SubscriptionConfirmation"
    | "UnsubscribeConfirmation";

export interface SnsMessage {
    Type: SnsMessageType;
    MessageId: string;
    TopicArn: string;
    Message: string;
    Timestamp: string;
    SignatureVersion: string;
    SigningCertURL: string;
    Signature: string;
    Subject?: string;
    Token?: string;
    SubscribeURL?: string;
}

interface SesS3Notification {
    notificationType: string;
    receipt: {
        recipients?: unknown;
        action?: {
            type?: unknown;
            bucketName?: unknown;
            objectKey?: unknown;
        };
    };
    mail: {
        messageId?: unknown;
    };
}

interface SesS3ObjectOptions {
    bucket: string;
    key: string;
    region: string;
}

interface SesInboundEmailAdapterDependencies {
    verifySnsMessage?: typeof verifySnsMessage;
    getS3Object?: (options: SesS3ObjectOptions) => Promise<Uint8Array>;
}

interface SnsSignatureVerificationOptions {
    getSigningKey?: (signingCertUrl: string) => Promise<KeyObject>;
}

interface SesInboundConfiguration {
    topicArn: string;
    bucket: string;
    region: string;
    objectPrefix?: string;
}

const s3Clients = new Map<string, S3Client>();

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRequiredString(
    value: Record<string, unknown>,
    key: string,
): string {
    const field = value[key];
    if (typeof field !== "string" || !field) {
        throw new InboundEmailError("invalid", `SNS message is missing ${key}`);
    }

    return field;
}

function getExpectedSesTopicArn() {
    const topicArn = process.env.INBOUND_EMAIL_SES_TOPIC_ARN?.trim();
    if (!topicArn) {
        throw new InboundEmailError(
            "configuration",
            "INBOUND_EMAIL_SES_TOPIC_ARN is not configured",
        );
    }

    return topicArn;
}

function getSesInboundConfiguration(): SesInboundConfiguration {
    const bucket = process.env.INBOUND_EMAIL_SES_BUCKET?.trim();
    const region = process.env.INBOUND_EMAIL_SES_REGION?.trim();
    if (!bucket || !region) {
        throw new InboundEmailError(
            "configuration",
            "SES inbound S3 bucket and region must be configured",
        );
    }

    const objectPrefix =
        process.env.INBOUND_EMAIL_SES_OBJECT_PREFIX?.trim().replace(
            /^\/+|\/+$/g,
            "",
        );

    return {
        topicArn: getExpectedSesTopicArn(),
        bucket,
        region,
        objectPrefix: objectPrefix || undefined,
    };
}

function assertExpectedSesTopic(topicArn: string) {
    if (!timingSafeEqualStrings(getExpectedSesTopicArn(), topicArn)) {
        throw new InboundEmailError(
            "authentication",
            "SNS message was not published by the expected topic",
        );
    }
}

function assertTrustedSnsEndpoint(value: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new InboundEmailError(
            "authentication",
            "SNS signing certificate URL is invalid",
        );
    }

    const trustedHost = /^sns\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/.test(
        url.hostname,
    );
    if (
        url.protocol !== "https:" ||
        url.port ||
        url.username ||
        url.password ||
        !trustedHost
    ) {
        throw new InboundEmailError(
            "authentication",
            "SNS endpoint URL is not trusted",
        );
    }

    return url;
}

function assertTrustedSnsCertificateUrl(value: string): URL {
    const url = assertTrustedSnsEndpoint(value);
    if (!url.pathname.endsWith(".pem")) {
        throw new InboundEmailError(
            "authentication",
            "SNS signing certificate URL is not trusted",
        );
    }

    return url;
}

function assertTrustedSnsSubscriptionUrl(value: string): URL {
    const url = assertTrustedSnsEndpoint(value);
    if (url.searchParams.get("Action") !== "ConfirmSubscription") {
        throw new InboundEmailError(
            "authentication",
            "SNS subscription confirmation URL is not trusted",
        );
    }

    return url;
}

async function getSnsSigningKey(signingCertUrl: string): Promise<KeyObject> {
    const url = assertTrustedSnsCertificateUrl(signingCertUrl);
    let response: Response;
    try {
        response = await fetch(url, {
            redirect: "error",
            signal: AbortSignal.timeout(5000),
        });
    } catch {
        throw new InboundEmailError(
            "transient",
            "Unable to retrieve the SNS signing certificate",
        );
    }

    if (!response.ok) {
        throw new InboundEmailError(
            "transient",
            "Unable to retrieve the SNS signing certificate",
        );
    }

    const certificate = await response.text();
    if (Buffer.byteLength(certificate) > MAX_SNS_SIGNING_CERTIFICATE_BYTES) {
        throw new InboundEmailError(
            "authentication",
            "SNS signing certificate is unexpectedly large",
        );
    }

    try {
        return new X509Certificate(certificate).publicKey;
    } catch {
        throw new InboundEmailError(
            "authentication",
            "SNS signing certificate is invalid",
        );
    }
}

export function parseSnsMessage(rawBody: string): SnsMessage {
    const body = parseJsonBody(rawBody);
    const type = getRequiredString(body, "Type") as SnsMessageType;
    if (
        type !== "Notification" &&
        type !== "SubscriptionConfirmation" &&
        type !== "UnsubscribeConfirmation"
    ) {
        throw new InboundEmailError("invalid", "Unsupported SNS message type");
    }

    const message: SnsMessage = {
        Type: type,
        MessageId: getRequiredString(body, "MessageId"),
        TopicArn: getRequiredString(body, "TopicArn"),
        Message: getRequiredString(body, "Message"),
        Timestamp: getRequiredString(body, "Timestamp"),
        SignatureVersion: getRequiredString(body, "SignatureVersion"),
        SigningCertURL: getRequiredString(body, "SigningCertURL"),
        Signature: getRequiredString(body, "Signature"),
    };
    if (typeof body.Subject === "string") {
        message.Subject = body.Subject;
    }
    if (typeof body.Token === "string") {
        message.Token = body.Token;
    }
    if (typeof body.SubscribeURL === "string") {
        message.SubscribeURL = body.SubscribeURL;
    }

    if (type === "SubscriptionConfirmation" && !message.SubscribeURL) {
        throw new InboundEmailError(
            "invalid",
            "SNS subscription confirmation is missing SubscribeURL",
        );
    }

    return message;
}

export function buildSnsSigningString(message: SnsMessage): string {
    const fields =
        message.Type === "Notification"
            ? [
                  "Message",
                  "MessageId",
                  "Subject",
                  "Timestamp",
                  "TopicArn",
                  "Type",
              ]
            : [
                  "Message",
                  "MessageId",
                  "SubscribeURL",
                  "Timestamp",
                  "Token",
                  "TopicArn",
                  "Type",
              ];

    return fields
        .flatMap((field) => {
            const value = message[field as keyof SnsMessage];
            return field === "Subject" && value === undefined
                ? []
                : [field, String(value ?? "")];
        })
        .join("\n");
}

export async function verifySnsMessage(
    message: SnsMessage,
    { getSigningKey = getSnsSigningKey }: SnsSignatureVerificationOptions = {},
): Promise<void> {
    assertExpectedSesTopic(message.TopicArn);
    if (message.SignatureVersion !== "2") {
        throw new InboundEmailError(
            "authentication",
            "SNS SignatureVersion 2 is required",
        );
    }

    let signature: Uint8Array;
    try {
        signature = Uint8Array.from(Buffer.from(message.Signature, "base64"));
    } catch {
        throw new InboundEmailError(
            "authentication",
            "SNS signature is invalid",
        );
    }

    if (!signature.length) {
        throw new InboundEmailError(
            "authentication",
            "SNS signature is invalid",
        );
    }

    const signingKey = await getSigningKey(message.SigningCertURL);
    const signingString = buildSnsSigningString(message);
    const valid =
        verify(
            "RSA-SHA256",
            textEncoder.encode(signingString),
            signingKey,
            signature,
        ) ||
        // Some SNS deliveries use the legacy final-delimiter form. It is safe
        // to accept only because the same AWS certificate still verifies it.
        verify(
            "RSA-SHA256",
            textEncoder.encode(`${signingString}\n`),
            signingKey,
            signature,
        );
    if (!valid) {
        throw new InboundEmailError(
            "authentication",
            "SNS message signature is invalid",
        );
    }
}

function getS3Client(region: string) {
    let client = s3Clients.get(region);
    if (!client) {
        client = new S3Client({ region });
        s3Clients.set(region, client);
    }

    return client;
}

async function getS3Object({
    bucket,
    key,
    region,
}: SesS3ObjectOptions): Promise<Uint8Array> {
    try {
        const result = await getS3Client(region).send(
            new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (
            !result.Body ||
            typeof result.Body.transformToByteArray !== "function"
        ) {
            throw new Error("S3 object had no readable body");
        }
        if (
            result.ContentLength !== undefined &&
            result.ContentLength > MAX_SES_S3_EMAIL_BYTES
        ) {
            throw new InboundEmailError(
                "invalid",
                "SES email object exceeds the supported size",
            );
        }

        const body = await result.Body.transformToByteArray();
        if (body.byteLength > MAX_SES_S3_EMAIL_BYTES) {
            throw new InboundEmailError(
                "invalid",
                "SES email object exceeds the supported size",
            );
        }

        return body;
    } catch (error) {
        if (error instanceof InboundEmailError) {
            throw error;
        }

        throw new InboundEmailError(
            "transient",
            "Unable to retrieve the SES email object",
        );
    }
}

function parseSesS3Notification(rawMessage: string): SesS3Notification {
    const value = parseJsonBody(rawMessage);
    if (!isRecord(value.receipt) || !isRecord(value.mail)) {
        throw new InboundEmailError(
            "invalid",
            "SES notification is missing receipt data",
        );
    }

    return {
        notificationType:
            typeof value.notificationType === "string"
                ? value.notificationType
                : "",
        receipt: {
            recipients: value.receipt.recipients,
            action: isRecord(value.receipt.action)
                ? value.receipt.action
                : undefined,
        },
        mail: {
            messageId: value.mail.messageId,
        },
    };
}

function getObjectLocation(
    notification: SesS3Notification,
    config: SesInboundConfiguration,
) {
    const action = notification.receipt.action;
    const bucket = action?.bucketName;
    const key = action?.objectKey;
    const expectedPrefix = config.objectPrefix;
    const hasExpectedPrefix =
        !expectedPrefix ||
        (typeof key === "string" &&
            (key === expectedPrefix || key.startsWith(`${expectedPrefix}/`)));

    if (
        notification.notificationType !== "Received" ||
        action?.type !== "S3" ||
        bucket !== config.bucket ||
        typeof key !== "string" ||
        !key ||
        !hasExpectedPrefix
    ) {
        throw new InboundEmailError(
            "invalid",
            "SES notification does not reference the configured S3 object",
        );
    }

    return { bucket, key, region: config.region };
}

async function parseMimeEmail({
    content,
    recipients,
    messageId,
}: {
    content: Uint8Array;
    recipients: unknown;
    messageId: unknown;
}): Promise<NormalizedInboundEmail> {
    let parsed;
    try {
        parsed = await simpleParser(Buffer.from(content));
    } catch {
        throw new InboundEmailError("invalid", "SES email MIME is invalid");
    }

    const from = parseEmailAddress(parsed.from?.value[0]?.address);
    const to = Array.from(
        new Set(
            parseEmailAddresses([
                ...(Array.isArray(recipients) ? recipients : []),
                ...(parsed.to?.value.map((recipient) => recipient.address) ||
                    []),
                ...(parsed.cc?.value.map((recipient) => recipient.address) ||
                    []),
            ]),
        ),
    );
    if (!from || !to.length) {
        throw new InboundEmailError(
            "invalid",
            "SES email is missing required address headers",
        );
    }

    return {
        from,
        to,
        subject: parsed.subject || undefined,
        textBody: parsed.text || "",
        messageId:
            parseMessageId(messageId) || parseMessageId(parsed.messageId),
    };
}

export function createSesInboundEmailAdapter(
    dependencies: SesInboundEmailAdapterDependencies = {},
): InboundEmailAdapter {
    const verifyMessage = dependencies.verifySnsMessage || verifySnsMessage;
    const loadS3Object = dependencies.getS3Object || getS3Object;

    return {
        provider: "ses",

        async verify(input: InboundEmailRequest) {
            await verifyMessage(parseSnsMessage(input.rawBody));
        },

        async parse(input: InboundEmailRequest): Promise<ParsedInboundEmail> {
            const envelope = parseSnsMessage(input.rawBody);
            assertExpectedSesTopic(envelope.TopicArn);
            if (envelope.Type === "SubscriptionConfirmation") {
                return {
                    kind: "subscription_confirmation",
                    subscribeUrl: envelope.SubscribeURL!,
                };
            }
            if (envelope.Type === "UnsubscribeConfirmation") {
                return { kind: "unsubscribe_confirmation" };
            }

            const config = getSesInboundConfiguration();
            const notification = parseSesS3Notification(envelope.Message);
            const location = getObjectLocation(notification, config);
            const content = await loadS3Object(location);

            return {
                kind: "email",
                email: await parseMimeEmail({
                    content,
                    recipients: notification.receipt.recipients,
                    messageId: notification.mail.messageId,
                }),
            };
        },
    };
}

export const sesAdapter = createSesInboundEmailAdapter();

export async function confirmSnsSubscription(subscribeUrl: string) {
    const url = assertTrustedSnsSubscriptionUrl(subscribeUrl);
    try {
        const response = await fetch(url, {
            redirect: "error",
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            throw new Error("SNS subscription confirmation failed");
        }
    } catch (error) {
        if (error instanceof InboundEmailError) {
            throw error;
        }

        throw new InboundEmailError(
            "transient",
            "Unable to confirm the SNS subscription",
        );
    }
}
