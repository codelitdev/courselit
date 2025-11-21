import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { customAdapter } from "./auth-adapter";
import { emailOTP } from "better-auth/plugins";
import { sso } from "@better-auth/sso";
import { addMailJob } from "../services/queue";

const client = new MongoClient(process.env.DB_CONNECTION_STRING || "");
const authCache = new Map<string, ReturnType<typeof betterAuth>>();

export const getAuth = async (domainId?: string) => {
    const cacheKey = domainId || "default";
    if (authCache.has(cacheKey)) {
        return authCache.get(cacheKey)!;
    }

    let socialProviders = {};
    let emailFrom = process.env.EMAIL_FROM || "noreply@courselit.app";
    let subjectPrefix = "Your Verification Code";

    if (domainId) {
        const { default: DomainModel } = await import("@models/Domain");
        const { generateEmailFrom } = await import("@/lib/utils");
        const domain = await DomainModel.findOne({ name: domainId });

        if (domain && domain.auth) {
            if (domain.auth.google?.enabled) {
                socialProviders = {
                    ...socialProviders,
                    google: {
                        clientId: domain.auth.google.clientId,
                        clientSecret: domain.auth.google.clientSecret,
                    },
                };
            }
            if (domain.auth.github?.enabled) {
                socialProviders = {
                    ...socialProviders,
                    github: {
                        clientId: domain.auth.github.clientId,
                        clientSecret: domain.auth.github.clientSecret,
                    },
                };
            }

            emailFrom = generateEmailFrom({
                name: domain.settings?.title || domain.name,
                email: process.env.EMAIL_FROM || domain.email,
            });
        }
    }

    const auth = betterAuth({
        database: customAdapter(client),
        plugins: [
            emailOTP({
                async sendVerificationOTP({ email, otp, type }) {
                    await addMailJob({
                        to: [email],
                        from: emailFrom,
                        subject: subjectPrefix,
                        body: `<p>Your verification code is: <strong>${otp}</strong></p>`,
                    });
                },
            }),
            sso(),
        ],
        socialProviders,
    });

    authCache.set(cacheKey, auth);
    return auth;
};

// Keep a default instance for non-request contexts if needed, but prefer getAuth
export const auth = betterAuth({
    database: customAdapter(client),
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                await addMailJob({
                    to: [email],
                    from: process.env.EMAIL_FROM || "noreply@courselit.app",
                    subject: "Your Verification Code",
                    body: `<p>Your verification code is: <strong>${otp}</strong></p>`,
                });
            },
        }),
        sso(),
    ],
});
