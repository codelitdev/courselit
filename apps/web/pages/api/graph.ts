import type { NextApiRequest } from "next";
import schema from "../../graphql";
import { graphql } from "graphql";
import { getAddress } from "../../lib/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";

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

    const session = await auth(req, res);
    // console.log(session, req.body.query)

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
