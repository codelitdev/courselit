import nextAuth from "next-auth";
import emailProvider from "next-auth/providers/email";
import NextAuthMultitenantMongoAdapter from "../../../lib/next-auth-multitenant-mongo-adapter";
import { getAddress } from "../../../lib/utils";
import getMongoClient from "../../../services/db";
import { send } from "../../../services/mail";
import pug from "pug";
import LoginEmailTemplate from "../../../templates/login-email";
import { responses } from "../../../config/strings";
import nc from "next-connect";
import { NextApiRequest, NextApiResponse } from "next";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import ApiRequest from "../../../models/ApiRequest";

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        error(err.message, {
            fileName: `/api/auth/[...nextauth].ts`,
            stack: err.stack,
        });
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
    attachParams: true,
})
    .use(connectDb)
    .use(verifyDomain)
    .use(nextAuthHandler);

const mongoClient = getMongoClient();

async function sendVerificationRequest(params, req) {
    console.log('sendVerificationRequest')
    const { identifier, url, provider, theme, token } = params;
    /*
    const host = req.headers["host"] || "";
    const protocol= req.headers["x-forwarded-proto"];
    const siteUrl = getAddress(host, protocol) 
    const callbackUrl = new URL(url) 
    callbackUrl.searchParams.set("callbackUrl", siteUrl)
    callbackUrl.host = host;
    console.log('sendVerificationRequest', url, siteUrl, callbackUrl.host)
    */
    console.log(url)

    const emailBody = pug.render(LoginEmailTemplate, { magiclink: url.toString() });
    await send({
        to: [identifier],
        subject: `${responses.sign_in_mail_prefix} ${req.headers["host"]}`,
        body: emailBody,
    });
}

export const getOptions = (req) => ({
    providers: [
        emailProvider({
            sendVerificationRequest: (params) => 
                sendVerificationRequest(params, req),
        }),
    ],
    adapter: NextAuthMultitenantMongoAdapter(mongoClient),
    pages: {
        signIn: '/auth/signin',
        verifyRequest: '/auth/verify-request'
    },
    debug: true,
    /*
    callbacks: {
        async redirect ({ url, baseUrl }) {
            //console.trace()
            const host = req.headers["host"] || "";
            const protocol= req.headers["x-forwarded-proto"];
            const siteUrl = getAddress(host, protocol) 
            console.log('Redirect', url, baseUrl, siteUrl)
            return siteUrl 
        }
    }
    */
});


async function nextAuthHandler (req: ApiRequest, res: NextApiResponse) {
    const host = req.headers["host"] || "";
    const protocol= req.headers["x-forwarded-proto"];
    const siteUrl = getAddress(host, protocol) 
    process.env.NEXTAUTH_URL = siteUrl;
    const options = getOptions(req)
    console.log(req.subdomain)
    const nextAuthInst = await nextAuth(req, res, options);
    return nextAuthInst
}
