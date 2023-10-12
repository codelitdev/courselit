import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createUser } from "../../../graphql/users/logic";
import User from "../../../models/User";
import VerificationToken from "../../../models/VerificationToken";
import connectToDatabase from "../../../services/db";
import { hashCode } from "../../../ui-lib/utils";
import Domain from "../../../models/Domain";
import { NextApiRequest, NextApiResponse } from "next";
import constants from "../../../config/constants";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {},
            async authorize(credentials, req) {
                const { email, code } = credentials;
                let domain: string;
                if (process.env.MULTITENANT === "true") {
                    domain = req.headers?.host?.split(".")[0];
                } else {
                    domain = constants.domainNameForSingleTenancy;
                }

                return await authorize({ email, code, domain });
            },
        }),
    ],
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
    domain: string;
}) {
    await connectToDatabase();

    const verificationToken = await VerificationToken.findOneAndDelete({
        email,
        domain,
        code: hashCode(code),
        timestamp: { $gt: Date.now() },
    });
    if (!verificationToken) {
        throw new Error("Invalid code");
    }

    let domainObj = await Domain.findOne({
        name: domain,
    });
    if (!domainObj) {
        throw new Error("Invalid domain");
    }

    let user = await User.findOne({
        domain: domainObj._id,
        email,
    });
    if (!user) {
        user = await createUser({
            domain: domainObj,
            email,
        });
    }
    return {
        id: user.userId,
        email,
        name: user.name,
    };
}

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    return await NextAuth(req, res, authOptions);
}

//export default NextAuth(authOptions)
