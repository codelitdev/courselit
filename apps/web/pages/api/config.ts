import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import { error } from "../../services/logger";
import connectDb from "../../middlewares/connect-db";
import verifyDomain from "../../middlewares/verify-domain";
import ApiRequest from "../../models/ApiRequest";

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        error(err.message, {
            fileName: `/api/cloudflare/index.ts`,
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
    .get(configHandler);

async function configHandler(req: ApiRequest, res: NextApiResponse) {
    return res.status(200).json({
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
    });
}
