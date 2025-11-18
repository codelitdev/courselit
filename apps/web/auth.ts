import NextAuth, { Session } from "next-auth";
import { z } from "zod";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import VerificationToken from "@models/VerificationToken";
import UserModel from "@models/User";
import { createUser } from "./graphql/users/logic";
import { hashCode } from "@/lib/utils";
import DomainModel, { Domain } from "@models/Domain";
import { error } from "./services/logger";
import { User } from "next-auth";
import { User as AppUser } from "@courselit/common-models";

type AuthReturn = ReturnType<typeof NextAuth>;

const authHandlers: AuthReturn = NextAuth({
    ...authConfig,
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {},
            async authorize(credentials, req) {
                const domain = await DomainModel.findOne<Domain>({
                    name: req.headers.get("domain"),
                });
                if (!domain) {
                    throw new Error("Domain not found");
                }
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        code: z.string().min(6),
                    })
                    .safeParse(credentials);
                if (!parsedCredentials.success) {
                    return null;
                }

                const { email, code } = parsedCredentials.data;
                const sanitizedEmail = email.toLowerCase();

                const verificationToken =
                    await VerificationToken.findOneAndDelete({
                        email: sanitizedEmail,
                        domain: domain.name,
                        code: hashCode(+code),
                        timestamp: { $gt: Date.now() },
                    });
                if (!verificationToken) {
                    error(`Invalid code`, {
                        email: sanitizedEmail,
                    });
                    return null;
                }

                let user = await UserModel.findOne({
                    domain: domain._id,
                    email: sanitizedEmail,
                });
                if (user && user.invited) {
                    user.invited = false;
                    await user.save();
                }
                if (!user) {
                    user = await createUser({
                        domain,
                        email: sanitizedEmail,
                    });
                }
                if (!user.active) {
                    return null;
                }
                return user;
            },
        }),
    ],
    callbacks: {
        jwt({ token, user }: { token: any; user?: User }) {
            if (user) {
                token.userId = (user as unknown as AppUser).userId;
                token.domain = (user as any).domain.toString();
            }
            return token;
        },
        session({ session, token }: { session: Session; token: any }) {
            if (session.user && token.userId) {
                if (token.userId) {
                    (session.user as any).userId = token.userId;
                }
                if (token.domain) {
                    (session.user as any).domain = token.domain;
                }
            }
            return session;
        },
    },
});

export const auth: AuthReturn["auth"] = authHandlers.auth;
export const signIn: AuthReturn["signIn"] = authHandlers.signIn;
export const signOut: AuthReturn["signOut"] = authHandlers.signOut;
export const handlers: AuthReturn["handlers"] = authHandlers.handlers;
