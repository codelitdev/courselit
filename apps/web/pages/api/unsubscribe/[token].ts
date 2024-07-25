import type { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../../config/strings";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Not allowed" });
    }

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const { token } = req.query;

    const user = await User.findOne({ unsubscribeToken: token });

    if (!user) {
        return res.status(200).send(responses.unsubscribe_success);
    }

    await user.updateOne({ subscribedToUpdates: false });

    return res.status(200).send(responses.unsubscribe_success);
}
