import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createUser } from "../../../graphql/users/logic";
import User from "../../../models/User";
import VerificationToken from "../../../models/VerificationToken";
import connectToDatabase from "../../../services/db";
import { hashCode } from "../../../ui-lib/utils";
import { NextApiRequest, NextApiResponse } from "next";
import DomainModel, { Domain } from "@models/Domain";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    return await NextAuth(req, res, getAuthOptions(domain));
}

const getAuthOptions = (domain: Domain) => ({
    ...authOptions,
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {},
            async authorize(credentials: any) {
                const { email, code } = credentials;

                return await authorize({ email, code, domain });
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
        async redirect({ url }) {
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
