import NextAuth from "next-auth";
import { z } from "zod";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import VerificationToken from "@models/VerificationToken";
import User from "@models/User";
import { createUser } from "./graphql/users/logic";
import { hashCode } from "@ui-lib/utils";
import DomainModel, { Domain } from "@models/Domain";
import { error } from "./services/logger";

export const { auth, signIn, signOut, handlers } = NextAuth({
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

                let user = await User.findOne({
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
                return {
                    id: user.userId,
                    email: sanitizedEmail,
                    name: user.name,
                };
            },
        }),
    ],
});
