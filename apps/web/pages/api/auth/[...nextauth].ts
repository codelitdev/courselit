import nc from "next-connect";
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createUser } from "../../../graphql/users/logic";
import User from "../../../models/User";
import VerificationToken from "../../../models/VerificationToken";
import connectToDatabase from "../../../services/db";
import { hashCode } from "../../../ui-lib/utils";
import { Domain } from "../../../models/Domain";
import { NextApiRequest, NextApiResponse } from "next";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import { error } from "../../../services/logger";
import ApiRequest from "@models/ApiRequest";

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        error(err.message, {
            fileName: `/api/auth/[...nextauth].ts`,
            stack: err.stack,
        });
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Page is not found");
    },
})
    .use(connectDb)
    .use(verifyDomain)
    .use(auth);

async function auth(req: NextApiRequest, res: NextApiResponse) {
    return await NextAuth(req, res, getAuthOptions(req));
}

const getAuthOptions = (req: ApiRequest) => ({
    ...authOptions,
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {},
            async authorize(credentials: any) {
                const { email, code } = credentials;

                return await authorize({ email, code, domain: req.subdomain });
            },
        }),
    ],
});

export const authOptions: NextAuthOptions = {
    providers: [],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            return url;
        },
    },
};

async function authorize({
    email,
    code,
    domain,
}: {
    email: string;
    code: string;
    domain: Domain;
}) {
    await connectToDatabase();

    const verificationToken = await VerificationToken.findOneAndDelete({
        email,
        domain: domain.name,
        code: hashCode(+code),
        timestamp: { $gt: Date.now() },
    });
    if (!verificationToken) {
        throw new Error("Invalid code");
    }

    let user = await User.findOne({
        domain: domain._id,
        email,
    });
    if (!user) {
        user = await createUser({
            domain,
            email,
        });
    }
    return {
        id: user.userId,
        email,
        name: user.name,
    };
}
