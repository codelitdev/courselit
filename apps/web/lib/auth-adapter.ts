import mongoose from "mongoose";
import { Adapter } from "better-auth/adapters";
import UserModel from "@/models/User";
import DomainModel, { Domain } from "@/models/Domain";
import VerificationToken from "@/models/VerificationToken";
import { hashCode } from "@/lib/utils";

export interface MultitenantAdapterOptions {
    getDomainFromRequest?: (request: Request) => Promise<string | null>;
}

export function createMultitenantAdapter(
    options: MultitenantAdapterOptions = {},
): Adapter {
    const getDomain = async (request?: Request): Promise<Domain | null> => {
        if (!request) return null;

        const domainName =
            request.headers.get("domain") ||
            options.getDomainFromRequest?.(request);

        if (!domainName) return null;

        return await DomainModel.findOne<Domain>({ name: domainName });
    };

    return {
        id: "multitenant-mongoose",

        async createUser(user, request) {
            const domain = await getDomain(request);
            if (!domain) {
                throw new Error("Domain not found");
            }

            const newUser = new UserModel({
                ...user,
                domain: domain._id,
                email: user.email.toLowerCase(),
                userId: new mongoose.Types.ObjectId().toString(),
                active: true,
                invited: false,
            });

            const savedUser = await newUser.save();
            return {
                id: savedUser._id.toString(),
                email: savedUser.email,
                emailVerified: savedUser.emailVerified || false,
                name: savedUser.name || "",
                image: savedUser.image || "",
                createdAt: savedUser.createdAt,
                updatedAt: savedUser.updatedAt,
            };
        },

        async getUserByEmail(email, request) {
            const domain = await getDomain(request);
            if (!domain) return null;

            const user = await UserModel.findOne({
                email: email.toLowerCase(),
                domain: domain._id,
            });

            if (!user) return null;

            return {
                id: user._id.toString(),
                email: user.email,
                emailVerified: user.emailVerified || false,
                name: user.name || "",
                image: user.image || "",
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        },

        async getUserById(id, request) {
            const domain = await getDomain(request);
            if (!domain) return null;

            const user = await UserModel.findOne({
                _id: id,
                domain: domain._id,
            });

            if (!user) return null;

            return {
                id: user._id.toString(),
                email: user.email,
                emailVerified: user.emailVerified || false,
                name: user.name || "",
                image: user.image || "",
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        },

        async updateUser(id, updates, request) {
            const domain = await getDomain(request);
            if (!domain) return null;

            const user = await UserModel.findOneAndUpdate(
                { _id: id, domain: domain._id },
                { ...updates, updatedAt: new Date() },
                { new: true },
            );

            if (!user) return null;

            return {
                id: user._id.toString(),
                email: user.email,
                emailVerified: user.emailVerified || false,
                name: user.name || "",
                image: user.image || "",
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        },

        async deleteUser(id, request) {
            const domain = await getDomain(request);
            if (!domain) return;

            await UserModel.findOneAndDelete({
                _id: id,
                domain: domain._id,
            });
        },

        async createSession(session, request) {
            // For better-auth, sessions are typically handled differently
            // We'll implement this based on better-auth's session management
            return {
                id: session.id,
                userId: session.userId,
                expiresAt: session.expiresAt,
                token: session.token,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        },

        async getSessionById(id, request) {
            // Implementation depends on how better-auth handles sessions
            // This is a placeholder that needs to be implemented based on your session storage
            return null;
        },

        async updateSession(id, updates, request) {
            // Implementation depends on how better-auth handles sessions
            return null;
        },

        async deleteSession(id, request) {
            // Implementation depends on how better-auth handles sessions
        },

        async createVerificationToken(token, request) {
            const domain = await getDomain(request);
            if (!domain) {
                throw new Error("Domain not found");
            }

            const verificationToken = new VerificationToken({
                email: token.identifier.toLowerCase(),
                domain: domain.name,
                code: hashCode(parseInt(token.token)),
                timestamp: token.expires,
            });

            await verificationToken.save();

            return {
                identifier: token.identifier,
                token: token.token,
                expires: token.expires,
            };
        },

        async getVerificationToken(identifier, token, request) {
            const domain = await getDomain(request);
            if (!domain) return null;

            const verificationToken = await VerificationToken.findOne({
                email: identifier.toLowerCase(),
                domain: domain.name,
                code: hashCode(parseInt(token)),
                timestamp: { $gt: Date.now() },
            });

            if (!verificationToken) return null;

            return {
                identifier: verificationToken.email,
                token: token,
                expires: verificationToken.timestamp,
            };
        },

        async deleteVerificationToken(identifier, token, request) {
            const domain = await getDomain(request);
            if (!domain) return;

            await VerificationToken.findOneAndDelete({
                email: identifier.toLowerCase(),
                domain: domain.name,
                code: hashCode(parseInt(token)),
            });
        },

        async createAccount(account, request) {
            // For OTP-only auth, we might not need accounts
            // This is a placeholder for future OAuth providers
            return {
                id: account.id,
                userId: account.userId,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        },

        async getAccountByUserId(userId, request) {
            // For OTP-only auth, we might not need accounts
            return null;
        },

        async deleteAccount(id, request) {
            // For OTP-only auth, we might not need accounts
        },

        async linkAccount(account, request) {
            // For OTP-only auth, we might not need accounts
            return null;
        },

        async unlinkAccount(account, request) {
            // For OTP-only auth, we might not need accounts
        },
    };
}
