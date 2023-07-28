import { MongoClient } from "mongodb";
import { AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";

export interface MongoDBAdapterOptions {
  collections?: {
    Users?: string
    Accounts?: string
    Sessions?: string
    VerificationTokens?: string
  }
  databaseName?: string
}

export const defaultCollections: Required<
  Required<MongoDBAdapterOptions>["collections"]
> = {
  Users: "users",
  Accounts: "accounts",
  Sessions: "sessions",
  VerificationTokens: "verification_tokens",
}

export default function NextAuthMultitenantMongoAdapter(
    client: Promise<MongoClient>, 
    options: MongoDBAdapterOptions = {}
) {
    const db = (async () => {
        const _db = (await client).db()
        const c = { ...defaultCollections }
        return {
            //U: _db.collection<AdapterUser>(c.Users),
            A: _db.collection<AdapterAccount>(c.Accounts),
            S: _db.collection<AdapterSession>(c.Sessions),
            V: _db.collection<VerificationToken>(c.VerificationTokens),
        }
    })()

    return {
        async createUser(user) {
            return;
        },
        async getUser(id) {
            console.log(`getUser: ${id}`);
            return;
        },
        async getUserByEmail(email) {
            console.log(`getUserByEmail: ${email}`);
            return;
        },
        async getUserByAccount({ providerAccountId, provider }) {
            return;
        },
        async updateUser(user) {
            return;
        },
        async deleteUser(userId) {
            return;
        },
        async linkAccount(account) {
            return;
        },
        async unlinkAccount({ providerAccountId, provider }) {
            return;
        },
        async createSession({ sessionToken, userId, expires }) {
            return;
        },
        async getSessionAndUser(sessionToken) {
            return;
        },
        async updateSession({ sessionToken }) {
            return;
        },
        async deleteSession(sessionToken) {
            return;
        },
        async createVerificationToken(data) {
            await (await db).V.insertOne(data);
            return data;
        },
        async useVerificationToken(identifier_token) {
            const { value: verificationToken } = await (
                await db
            ).V.findOneAndDelete(identifier_token)

            if (!verificationToken) return null
                // @ts-expect-error
                delete verificationToken._id
                return verificationToken
        },
    };
}
