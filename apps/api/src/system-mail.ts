import { createTransport } from "nodemailer";
import {
  sendLitConfig,
  sendSendLitTransactionalEmail,
  type FetchLike,
} from "./sendlit-client.js";

export type SystemMailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SystemMailDelivery = "sendlit" | "smtp" | "console";

type Environment = Record<string, string | undefined>;

type SmtpTransport = {
  sendMail(message: Record<string, unknown>): Promise<unknown>;
};

type SmtpTransportFactory = (options: {
  host: string;
  port: number;
  auth?: { user: string; pass: string };
}) => SmtpTransport;

export class SystemMailDeliveryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "SystemMailDeliveryError";
    if (cause !== undefined) this.cause = cause;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function textAsHtml(text: string): string {
  return `<p>${escapeHtml(text).replace(/\r?\n/g, "<br />")}</p>`;
}

function smtpConfig(env: Environment) {
  const host = env.EMAIL_HOST?.trim();
  if (!host) return null;
  const user = env.EMAIL_USER?.trim();
  const portValue = Number(env.EMAIL_PORT ?? "587");
  return {
    host,
    port: Number.isFinite(portValue) && portValue > 0 ? portValue : 587,
    auth: user ? { user, pass: env.EMAIL_PASS ?? "" } : undefined,
    from: env.EMAIL_FROM?.trim() || undefined,
  };
}

/**
 * Delivers CourseLit-owned system mail using the deployment-level provider.
 * SendLit intentionally wins over SMTP when its platform team key is set;
 * school-level SendLit teams are reserved for school-owned marketing mail.
 * With neither provider configured, the complete message is dumped to the
 * API console so local development and recovery workflows remain usable.
 */
export async function sendSystemMail(
  message: SystemMailMessage,
  options: {
    env?: Environment;
    fetcher?: FetchLike;
    transportFactory?: SmtpTransportFactory;
  } = {},
): Promise<SystemMailDelivery> {
  const env = options.env ?? process.env;
  const platformTeamApiKey = env.SENDLIT_PLATFORM_TEAM_API_KEY?.trim();

  if (platformTeamApiKey) {
    await sendSendLitTransactionalEmail(
      platformTeamApiKey,
      {
        to: message.to,
        subject: message.subject,
        html: message.html ?? textAsHtml(message.text),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      },
      { config: sendLitConfig(env), fetcher: options.fetcher },
    );
    return "sendlit";
  }

  const smtp = smtpConfig(env);
  if (smtp) {
    try {
      const transporter = options.transportFactory
        ? options.transportFactory({
            host: smtp.host,
            port: smtp.port,
            ...(smtp.auth ? { auth: smtp.auth } : {}),
          })
        : createTransport({
            host: smtp.host,
            port: smtp.port,
            ...(smtp.auth ? { auth: smtp.auth } : {}),
          });
      await transporter.sendMail({
        ...(smtp.from ? { from: smtp.from } : {}),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html ?? textAsHtml(message.text),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      return "smtp";
    } catch (error) {
      throw new SystemMailDeliveryError("SMTP system mail delivery failed", error);
    }
  }

  console.info("[CourseLit] System email", message); // eslint-disable-line no-console
  return "console";
}

export function sendTeamInvitationEmail(input: {
  email: string;
  acceptUrl: string;
  schoolName: string;
  inviterName: string | null;
  expiresAt: Date;
}): Promise<SystemMailDelivery> {
  const acceptUrl = escapeHtml(input.acceptUrl);
  const email = escapeHtml(input.email);
  const schoolName = escapeHtml(input.schoolName);
  const inviterName = escapeHtml(input.inviterName || "Someone");
  const expiresAt = input.expiresAt.toUTCString();
  const subjectSchoolName = input.schoolName.replace(/[\r\n]+/g, " ").trim();
  return sendSystemMail({
    to: input.email,
    subject: `Join ${subjectSchoolName} on CourseLit`,
    text: `${input.inviterName || "Someone"} invited you to join ${input.schoolName} on CourseLit.\n\nYou've been invited to collaborate on this school.\n\nThis invitation expires on ${expiresAt}.\n\nSign in with ${input.email}, then accept the invitation: ${input.acceptUrl}`,
    html: `<p>${inviterName} invited you to join ${schoolName} on CourseLit.</p><p>You've been invited to collaborate on this school.</p><p>This invitation expires on ${expiresAt}.</p><p>Sign in with ${email}, then <a href="${acceptUrl}">accept the invitation</a>.</p>`,
  });
}
