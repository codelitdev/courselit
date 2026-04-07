import { APIError, betterAuth } from "better-auth";
import { customSession, emailOTP } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { InternalUser } from "@courselit/orm-models";
import { generateUniqueId, getEmailFrom } from "@courselit/utils";
import { addMailJob } from "@/services/queue";
import pug from "pug";
import MagicCodeEmailTemplate from "@/templates/magic-code-email";
import { responses } from "@/config/strings";
import { mongodbAdapter } from "@/ba-multitenant-adapter";
import { getBackendAddress } from "./app/actions";
import { sso } from "@better-auth/sso";
import constants from "@/config/constants";
import { finalizeUserCreation } from "./graphql/users/logic";
import { sanitizeEmail } from "./lib/sanitize-email";
import DomainModel, { Domain } from "@models/Domain";
import UserModel from "@models/User";
import { als } from "./async-local-storage";

const client = new MongoClient(
    process.env.DB_CONNECTION_STRING || "mongodb://localhost:27017",
);
const db = client.db();

const toDomainId = (value: unknown) => {
    if (typeof value === "string" && value) {
        return value;
    }

    if (
        value &&
        typeof value === "object" &&
        "toString" in value &&
        typeof value.toString === "function"
    ) {
        const serialized = value.toString();
        return serialized ? serialized : undefined;
    }

    return undefined;
};

const getAuthDomain = async ({
    user,
    ctx,
}: {
    user?: Record<string, unknown>;
    ctx?: { headers?: Headers };
}): Promise<Domain> => {
    const domainId =
        toDomainId(user?.domain) ||
        ctx?.headers?.get("domainId") ||
        als.getStore()?.get("domainId");
    const domainName =
        ctx?.headers?.get("domain") || als.getStore()?.get("domain");

    const domain = (domainId
        ? await DomainModel.findById(domainId).lean()
        : await DomainModel.findOne<Domain>({
              name: domainName,
          }).lean()) as unknown as Domain;

    if (!domain) {
        throw new APIError("NOT_FOUND", {
            message: "Domain not found",
        });
    }

    return domain;
};

const getSessionUserId = async (
    user: Partial<InternalUser> & { id?: string },
) => {
    if (user.userId) {
        return user.userId;
    }

    if (!user.id) {
        return undefined;
    }

    const authUser = await UserModel.findOne({ _id: user.id })
        .select("userId")
        .lean();

    return (authUser as { userId?: string } | null)?.userId;
};

const config: any = {
    appName: "CourseLit",
    secret: process.env.AUTH_SECRET,
    user: {
        additionalFields: {
            userId: {
                type: "string",
                required: false,
            },
            active: {
                type: "boolean",
                required: false,
            },
            purchases: {
                type: "json",
                required: false,
            },
            permissions: {
                type: "string[]",
                required: false,
            },
            lead: {
                type: "string",
                required: false,
            },
            subscribedToUpdates: {
                type: "boolean",
                required: false,
            },
            tags: {
                type: "string[]",
                required: false,
            },
            unsubscribeToken: {
                type: "string",
                required: false,
            },
        },
    },
    account: {
        storeStateStrategy: "cookie",
        accountLinking: {
            enabled: true,
            trustedProviders: ["sso", "google"],
        },
    },
    advanced: {
        cookiePrefix: "courselit",
        cookies: {
            relay_state: {
                attributes: {
                    sameSite: "none",
                    secure: true,
                },
            },
        },
    },
    database: mongodbAdapter(db, {
        client,
        usePlural: true,
        // Enable transactions by default; set DB_TRANSACTIONS=false to opt out.
        transaction:
            process.env.DB_TRANSACTIONS === undefined
                ? true
                : process.env.DB_TRANSACTIONS.toLowerCase() !== "false",
    }),
    plugins: [
        emailOTP({
            overrideDefaultEmailVerification: true,
            storeOTP: "hashed",
            async sendVerificationOTP({ email, otp, type }, ctx) {
                const emailBody = pug.render(MagicCodeEmailTemplate, {
                    code: otp,
                    hideCourseLitBranding: ctx!.headers?.get(
                        "hidecourselitbranding",
                    )
                        ? ctx!.headers?.get("hidecourselitbranding") === "true"
                        : false,
                });

                await addMailJob({
                    to: [email],
                    subject: `${responses.sign_in_mail_prefix} ${ctx!.headers?.get("host")}`,
                    body: emailBody,
                    from: getEmailFrom({
                        name:
                            ctx!.headers?.get("domaintitle") ||
                            ctx!.headers?.get("domain") ||
                            "",
                        email: process.env.EMAIL_FROM || "",
                    }),
                });
            },
        }),
        customSession(async ({ user, session }, ctx) => {
            return {
                user: {
                    ...user,
                    userId: await getSessionUserId(
                        user as Partial<InternalUser> & { id?: string },
                    ),
                },
                session: {
                    ...session,
                    domainId: ctx.headers?.get("domainId"),
                },
            };
        }),
        sso({
            saml: {
                enableInResponseToValidation: true,
                requestTTL: 10 * 60 * 1000, // 10 minutes
                clockSkew: 5 * 60 * 1000, // 5 minutes
                requireTimestamps: true,
            },
            fields: {
                domain: "domain_string",
            },
        }),
    ],
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    return {
                        data: {
                            email: sanitizeEmail(user.email),
                            active: true,
                            userId: generateUniqueId(),
                            purchases: [],
                            permissions: [
                                constants.permissions.enrollInCourse,
                                constants.permissions.manageMedia,
                            ],
                            lead: constants.leadWebsite,
                            subscribedToUpdates: true,
                            tags: [],
                            unsubscribeToken: generateUniqueId(),
                        },
                    };
                },
                after: async (user, ctx) => {
                    const domain = await getAuthDomain({
                        user: user as Record<string, unknown>,
                        ctx,
                    });
                    await finalizeUserCreation(
                        user as InternalUser,
                        domain._id.toString(),
                    );
                },
            },
        },
    },
    trustedOrigins: async (request?: Request) => {
        // Better Auth may invoke this during initialization/auth.api calls without a request.
        if (!request) {
            return [];
        }

        const origins: string[] = [
            await getBackendAddress(request.headers),
            "https://accounts.google.com",
            "https://oauth2.googleapis.com",
            "https://openidconnect.googleapis.com",
            "https://www.googleapis.com",
        ];
        if (request.headers.get("ssotrusteddomain")) {
            origins.push(request.headers.get("ssotrusteddomain")!);
        }
        return origins;
    },
};

if (process.env.SESSION_COOKIE_CACHE_MAX_AGE) {
    if (parseInt(process.env.SESSION_COOKIE_CACHE_MAX_AGE) > 0) {
        config.session = {
            cookieCache: {
                enabled: true,
                maxAge: parseInt(process.env.SESSION_COOKIE_CACHE_MAX_AGE) * 60,
            },
        };
    }
} else {
    config.session = {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    };
}

export const auth = betterAuth(config);
