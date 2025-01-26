import type { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../config/strings";
import ApiKey from "../../models/ApiKey";
import { createUser } from "../../graphql/users/logic";
import constants from "@config/constants";
import { createHash } from "crypto";
import DomainModel, { Domain } from "@models/Domain";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Not allowed" });
    }

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const apikey = req.body.apikey;
    if (!apikey) {
        return res.status(400).json({ message: "Bad request" });
    }
    const apikeyObj = await ApiKey.findOne({
        domain: domain._id,
        key: apikey,
    });

    if (!apikeyObj) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { email, subscribedToUpdates } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Bad request" });
    }

    if (subscribedToUpdates && typeof subscribedToUpdates !== "boolean") {
        return res.status(400).json({ error: "Bad request" });
    }

    try {
        await createUser({
            domain,
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
}

function createMd5Sum(input) {
    const hash = createHash("md5");
    hash.update(input);
    return hash.digest("hex");
}
