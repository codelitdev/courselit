import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import { error } from "../../../services/logger";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import ApiRequest from "../../../models/ApiRequest";
import { validateTurnstileToken } from "@courselit/utils";

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
    .post(turnstileVerificationHandler);

async function turnstileVerificationHandler(
    req: ApiRequest,
    res: NextApiResponse,
) {
    const { token } = req.body;
    const verifyTurnstileToken = await validateTurnstileToken(token);
    if (verifyTurnstileToken) {
        return res.status(200).json({ success: true });
    }

    return res.status(403).json({ success: false });
}
