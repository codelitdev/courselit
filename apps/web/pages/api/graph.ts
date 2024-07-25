import type { NextApiRequest } from "next";
import schema from "../../graphql";
// import verifyDomain from "../../middlewares/verify-domain";
// import nc from "next-connect";
import { graphql } from "graphql";
// import ApiRequest from "../../models/ApiRequest";
// import connectDb from "../../middlewares/connect-db";
// import { error } from "../../services/logger";
// import { responses } from "../../config/strings";
import { getAddress } from "../../lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "3mb",
        },
    },
};

async function updateLastActive(user: any) {
    const dateNow = new Date();
    dateNow.setUTCHours(0, 0, 0, 0);
    const userLastActiveDate = new Date(user.updatedAt);
    userLastActiveDate.setUTCHours(0, 0, 0, 0);

    if (dateNow.getTime() > userLastActiveDate.getTime()) {
        user.updatedAt = new Date();
        await user.save();
    }
}

// export default nc<NextApiRequest, NextApiResponse>({
//     onError: (err, req, res, next) => {
//         if (err.message.indexOf(responses.domain_doesnt_exist) === -1) {
//             error(err.message, {
//                 fileName: `/api/graph.ts`,
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
//     .use(async (req: ApiRequest, res: NextApiResponse, next: any) => {
//         const session = await getServerSession(req, res, authOptions);

//         if (session) {
//             const user = await User.findOne({
//                 email: session.user.email,
//                 domain: req.subdomain._id,
//                 active: true,
//             });

//             if (user) {
//                 updateLastActive(user);
//                 req.user = user;
//             }
//         }

//         next();
//     })
//     .post(async (req: ApiRequest, res: NextApiResponse) => {
//         if (!req.body.hasOwnProperty("query")) {
//             res.status(400).json({ error: "Query is missing" });
//         }

//         const { query, variables } = req.body.query;
//         const hostname = req.headers["host"] || "";
//         const protocol = req.headers["x-forwarded-proto"];
//         const contextValue = {
//             user: req.user,
//             subdomain: req.subdomain,
//             address: getAddress(hostname, protocol),
//         };
//         const response = await graphql({
//             schema,
//             source: query || req.body.query,
//             rootValue: null,
//             contextValue,
//             variableValues: variables,
//         });
//         return res.status(200).json(response);
//     });

export default async function handler(req: NextApiRequest, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Not allowed" });
    }

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const session = await getServerSession(req, res, authOptions);

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });

        if (user) {
            updateLastActive(user);
        }
    }

    if (!req.body.hasOwnProperty("query")) {
        res.status(400).json({ error: "Query is missing" });
    }

    const { query, variables } = req.body.query;
    const hostname = req.headers["host"] || "";
    const protocol = req.headers["x-forwarded-proto"];
    const contextValue = {
        user,
        subdomain: domain,
        address: getAddress(hostname, protocol),
    };
    const response = await graphql({
        schema,
        source: query || req.body.query,
        rootValue: null,
        contextValue,
        variableValues: variables,
    });
    return res.status(200).json(response);
}
