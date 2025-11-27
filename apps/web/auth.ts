import { APIError, betterAuth } from "better-auth";
import { customSession, emailOTP } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import DomainModel, { Domain } from "@models/Domain";
import { addMailJob } from "@/services/queue";
import pug from "pug";
import MagicCodeEmailTemplate from "@/templates/magic-code-email";
import { generateEmailFrom } from "@/lib/utils";
import { responses } from "@/config/strings";
import { mongodbAdapter } from "@/ba-multitenant-adapter";
import { updateUserAfterCreationViaAuth } from "./graphql/users/logic";
import UserModel from "@models/User";
import { getBackendAddress } from "./app/actions";

const client = new MongoClient(
    process.env.DB_CONNECTION_STRING || "mongodb://localhost:27017",
);
const db = client.db();

const config: any = {
    appName: "CourseLit",
    secret: process.env.AUTH_SECRET,
    advanced: {
        cookiePrefix: "courselit",
    },
    database: mongodbAdapter(db, {
        client,
        usePlural: true,
    }),
    plugins: [
        emailOTP({
            overrideDefaultEmailVerification: true,
            storeOTP: "hashed",
            async sendVerificationOTP({ email, otp, type }, ctx) {
                const emailBody = pug.render(MagicCodeEmailTemplate, {
                    code: otp,
                    hideCourseLitBranding:
                        ctx!.headers?.get("hidecourselitbranding") || false,
                });

                await addMailJob({
                    to: [email],
                    subject: `${responses.sign_in_mail_prefix} ${ctx!.headers?.get("domain")}`,
                    body: emailBody,
                    from: generateEmailFrom({
                        name:
                            ctx!.headers?.get("domainTitle") ||
                            ctx!.headers?.get("domain") ||
                            "",
                        email:
                            process.env.EMAIL_FROM ||
                            ctx!.headers?.get("domainemail") ||
                            "",
                    }),
                });
            },
        }),
        customSession(async ({ user, session }, ctx) => {
            return {
                user: {
                    ...user,
                    userId: (
                        (await UserModel.findOne({ _id: user.id })
                            .select("userId")
                            .lean()) as unknown as any
                    ).userId,
                },
                session: {
                    ...session,
                    domainId: ctx.headers?.get("domainId"),
                },
            };
        }),
    ],
    databaseHooks: {
        user: {
            create: {
                after: async (user, ctx) => {
                    const domainName = ctx!.headers?.get("domain");
                    const domain = (await DomainModel.findOne<Domain>({
                        name: domainName,
                    }).lean()) as unknown as Domain;
                    if (!domain) {
                        throw new APIError("NOT_FOUND", {
                            message: "Domain not found",
                        });
                    }

                    await updateUserAfterCreationViaAuth(user.id, domain);
                },
            },
        },
    },
    trustedOrigins: async (request: Request) => {
        const backendAddress = await getBackendAddress(request.headers);
        return [backendAddress];
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
