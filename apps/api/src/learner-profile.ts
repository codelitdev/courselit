import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  createSendLitContact,
  listSendLitContacts,
  SendLitApiError,
  type SendLitConfig,
  type SendLitContact,
  updateSendLitContact,
} from "./sendlit-client.js";
import type { AppDb } from "./types.js";
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";

export const LEARNER_BIO_FIELD = "courselit_bio";
export const LEARNER_AVATAR_MEDIA_ID_FIELD = "courselit_avatar_media_id";
export const LEARNER_AVATAR_URL_FIELD = "courselit_avatar_url";

export type LearnerProfileFields = {
  bio: string;
  avatarMediaId: string | null;
  image: string | null;
  emailUpdatesEnabled: boolean;
};

type LearnerContactContext = {
  teamApiKey: string;
  contact: SendLitContact | null;
};

function isSendLitAvailable(config: SendLitConfig) {
  return Boolean(config.server);
}

async function contactContext(
  db: AppDb,
  config: SendLitConfig,
  schoolId: string,
  email: string,
): Promise<LearnerContactContext | null> {
  if (!isSendLitAvailable(config)) return null;
  const [integration] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
        eq(schema.schoolIntegrations.status, "ready"),
      ),
    )
    .limit(1);
  if (!integration?.encryptedTeamKey) return null;

  try {
    const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
    const contacts = await listSendLitContacts(
      teamApiKey,
      { q: email, rowsPerPage: 50 },
      { config },
    );
    const contact =
      contacts.items.find((item) => item.email.toLowerCase() === email.toLowerCase()) ??
      null;
    return { teamApiKey, contact };
  } catch (error) {
    if (error instanceof SendLitApiError) return null;
    return null;
  }
}

function stringField(contact: SendLitContact, key: string): string | null {
  const value = contact.customFields[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function learnerProfileFromContact(
  contact: SendLitContact | null,
): LearnerProfileFields {
  if (!contact) {
    return {
      bio: "",
      avatarMediaId: null,
      image: null,
      emailUpdatesEnabled: true,
    };
  }
  return {
    bio: stringField(contact, LEARNER_BIO_FIELD) ?? "",
    avatarMediaId: stringField(contact, LEARNER_AVATAR_MEDIA_ID_FIELD),
    image: stringField(contact, LEARNER_AVATAR_URL_FIELD),
    emailUpdatesEnabled: contact.subscribed,
  };
}

export async function readLearnerProfile(
  db: AppDb,
  config: SendLitConfig,
  input: { schoolId: string; email: string },
): Promise<LearnerProfileFields> {
  const context = await contactContext(db, config, input.schoolId, input.email);
  return learnerProfileFromContact(context?.contact ?? null);
}

function profileCustomFields(
  existing: Record<string, unknown>,
  input: { bio: string; avatarMediaId: string | null; avatarUrl: string | null },
) {
  const customFields = { ...existing };
  if (input.bio.trim()) customFields[LEARNER_BIO_FIELD] = input.bio.trim();
  else delete customFields[LEARNER_BIO_FIELD];
  if (input.avatarMediaId) {
    customFields[LEARNER_AVATAR_MEDIA_ID_FIELD] = input.avatarMediaId;
  } else {
    delete customFields[LEARNER_AVATAR_MEDIA_ID_FIELD];
  }
  if (input.avatarUrl) {
    customFields[LEARNER_AVATAR_URL_FIELD] = input.avatarUrl;
  } else {
    delete customFields[LEARNER_AVATAR_URL_FIELD];
  }
  return customFields;
}

export async function updateLearnerProfileContact(
  db: AppDb,
  config: SendLitConfig,
  input: {
    schoolId: string;
    email: string;
    name: string;
    bio: string;
    emailUpdatesEnabled: boolean;
    avatarMediaId: string | null;
    avatarUrl: string | null;
  },
): Promise<LearnerProfileFields | null> {
  const context = await contactContext(db, config, input.schoolId, input.email);
  if (!context) return null;
  const customFields = profileCustomFields(context.contact?.customFields ?? {}, input);
  const contact = context.contact
    ? await updateSendLitContact(
        context.teamApiKey,
        context.contact.contactId,
        {
          name: input.name,
          subscribed: input.emailUpdatesEnabled,
          customFields,
        },
        { config },
      )
    : await createSendLitContact(
        context.teamApiKey,
        {
          email: input.email,
          name: input.name,
          customFields,
        },
        { config },
      ).then(async (created) => {
        if (created.subscribed === input.emailUpdatesEnabled) return created;
        return updateSendLitContact(
          context.teamApiKey,
          created.contactId,
          {
            subscribed: input.emailUpdatesEnabled,
            customFields: created.customFields,
          },
          { config },
        );
      });
  return learnerProfileFromContact(contact);
}
