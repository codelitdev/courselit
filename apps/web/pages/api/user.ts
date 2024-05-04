import type { NextApiRequest, NextApiResponse } from "next";
import verifyDomain from "../../middlewares/verify-domain";
import nc from "next-connect";
import ApiRequest from "../../models/ApiRequest";
import connectDb from "../../middlewares/connect-db";
import { error } from "../../services/logger";
import { responses } from "../../config/strings";
import ApiKey from "../../models/ApiKey";
import { createUser } from "../../graphql/users/logic";
import constants from "@config/constants";
import { createHash } from "crypto";

function createMd5Sum(input) {
    const hash = createHash("md5");
    hash.update(input);
    return hash.digest("hex");
}

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
    .use(async (req: ApiRequest, res: NextApiResponse, next: any) => {
        const apikey = req.body.apikey;
        if (!apikey) {
            return res.status(400).json({ error: "Bad request" });
        }
        const apikeyObj = await ApiKey.findOne({
            domain: req.subdomain._id,
            key: apikey,
        });

        if (!apikeyObj) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        next();
    })
    .post(async (req: ApiRequest, res: NextApiResponse) => {
        const { email, subscribedToUpdates } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Bad request" });
        }

        if (subscribedToUpdates && typeof subscribedToUpdates !== "boolean") {
            return res.status(400).json({ error: "Bad request" });
        }

        try {
            await createUser({
                domain: req.subdomain!,
                email: email,
                lead: constants.leadApi,
                subscribedToUpdates,
            });

            return res.status(200).json({
                email: createMd5Sum(email),
            });
        } catch (err: any) {
            if (err.message.indexOf("E11000") !== -1) {
                return res
                    .status(400)
                    .json({ error: responses.user_already_exists });
            }
            return res.status(500).json({ error: responses.internal_error });
        }
    });
