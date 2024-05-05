import type { NextApiRequest, NextApiResponse } from "next";
import verifyDomain from "../../../middlewares/verify-domain";
import nc from "next-connect";
import ApiRequest from "../../../models/ApiRequest";
import connectDb from "../../../middlewares/connect-db";
import { error } from "../../../services/logger";
import { responses } from "../../../config/strings";
import User from "@models/User";

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        if (err.message.indexOf(responses.domain_doesnt_exist) === -1) {
            error(err.message, {
                fileName: `/api/user.ts`,
                stack: err.stack,
            });
        }
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
})
    .use(connectDb)
    .use(verifyDomain)
    .get(unsubscribeUser);

async function unsubscribeUser(req: ApiRequest, res: NextApiResponse) {
    const { token } = req.query;

    const user = await User.findOne({ unsubscribeToken: token });

    if (!user) {
        return res.status(200).send(responses.unsubscribe_success);
    }

    await user.updateOne({ subscribedToUpdates: false });

    return res.status(200).send(responses.unsubscribe_success);
}
