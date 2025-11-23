import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { createMultitenantAdapter, getRequestContext } from "./auth-adapter";
import { hashCode } from "@/lib/utils";
import VerificationToken from "@/models/VerificationToken";
import DomainModel, { Domain } from "@/models/Domain";
import pug from "pug";
import MagicCodeEmailTemplate from "@/templates/magic-code-email";
import { generateEmailFrom } from "@/lib/utils";
import { addMailJob } from "@/services/queue";

// Create adapter - using factory pattern from better-auth
const adapter = createMultitenantAdapter();

// Wrap betterAuth creation in try-catch to handle initialization errors
let authInstance;
try {
    authInstance = betterAuth({
        baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        database: adapter,

        trustedOrigins: [
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        ],

        plugins: [
            emailOTP({
                async sendVerificationOTP({ email, otp, type }) {
                    // Get request from context (set by API route handler)
                    const req = getRequestContext();

                    if (!req) {
                        console.error(
                            "sendVerificationOTP: No request context available",
                        );
                        throw new Error(
                            "Domain not found - request context not available",
                        );
                    }

                    // Handle both NextRequest and standard Request
                    let domainName: string | null = null;
                    try {
                        if (
                            req.headers &&
                            typeof req.headers.get === "function"
                        ) {
                            domainName = req.headers.get("domain");
                        } else if (
                            req.headers &&
                            typeof req.headers === "object"
                        ) {
                            // Fallback for different header structures
                            domainName =
                                req.headers["domain"] || req.headers.domain;
                        }
                    } catch (err) {
                        console.error("Error accessing request headers:", err);
                    }

                    if (!domainName) {
                        console.error(
                            "sendVerificationOTP: Domain header not found in request",
                        );
                        throw new Error(
                            "Domain not found - domain header not present",
                        );
                    }

                    const domain = await DomainModel.findOne<Domain>({
                        name: domainName,
                    });

                    if (!domain) {
                        throw new Error("Domain not found");
                    }

                    const sanitizedEmail = email.toLowerCase();

                    // Store the OTP in our verification token system
                    await VerificationToken.create({
                        domain: domain.name,
                        email: sanitizedEmail,
                        code: hashCode(parseInt(otp)),
                        timestamp: Date.now() + 1000 * 60 * 5, // 5 minutes expiry
                    });

                    try {
                        const emailBody = pug.render(MagicCodeEmailTemplate, {
                            code: otp,
                            hideCourseLitBranding:
                                domain.settings?.hideCourseLitBranding,
                        });

                        const host = domain.name;

                        await addMailJob({
                            to: [sanitizedEmail],
                            subject: `Sign in to ${host}`,
                            body: emailBody,
                            from: generateEmailFrom({
                                name: domain?.settings?.title || domain.name,
                                email: process.env.EMAIL_FROM || domain.email,
                            }),
                        });
                    } catch (err: any) {
                        throw new Error(`Failed to send email: ${err.message}`);
                    }
                },

                otpLength: 6,
                expiresIn: 300, // 5 minutes
                allowedAttempts: 3,
            }),
        ],

        session: {
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24, // 1 day
            cookieCache: {
                enabled: true,
                maxAge: 60 * 60 * 24 * 7, // 7 days
            },
        },

        user: {
            additionalFields: {
                domain: {
                    type: "string",
                    required: true,
                },
                userId: {
                    type: "string",
                    required: true,
                },
                active: {
                    type: "boolean",
                    required: true,
                    defaultValue: true,
                },
                invited: {
                    type: "boolean",
                    required: true,
                    defaultValue: false,
                },
            },
        },

        callbacks: {
            async signIn({ user, request }) {
                const domainName = request?.headers.get("domain");
                if (!domainName) {
                    throw new Error("Domain not found");
                }

                const domain = await DomainModel.findOne<Domain>({
                    name: domainName,
                });

                if (!domain) {
                    throw new Error("Domain not found");
                }

                // Check if user is active
                if (!user.active) {
                    throw new Error("User account is inactive");
                }

                return true;
            },
        },
    });
} catch (error: any) {
    console.error("Failed to initialize better-auth:", error);
    console.error("Error details:", error.message, error.stack);
    // Re-throw to prevent silent failures
    throw error;
}

export const auth = authInstance!;
export type Session = typeof auth.$Infer.Session;
