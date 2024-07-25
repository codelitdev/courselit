import type { NextApiRequest, NextApiResponse } from "next";
// import verifyDomain from "../../../middlewares/verify-domain";
// import nc from "next-connect";
// import ApiRequest from "../../../models/ApiRequest";
// import connectDb from "../../../middlewares/connect-db";
// import { error } from "../../../services/logger";
import { responses } from "../../../config/strings";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";

// export default nc<NextApiRequest, NextApiResponse>({
//     onError: (err, req, res, next) => {
//         if (err.message.indexOf(responses.domain_doesnt_exist) === -1) {
//             error(err.message, {
//                 fileName: `/api/user.ts`,
//                 stack: err.stack,
//             });
//         }
//         res.status(500).json({ error: err.message });
//     },
//     onNoMatch: (req, res) => {
//         res.status(404).end("Not found");
//     },
// })
//     .use(connectDb)
//     .use(verifyDomain)
//     .get(unsubscribeUser);

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
