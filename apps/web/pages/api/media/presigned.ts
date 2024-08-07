import { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../../config/strings";
import * as medialitService from "../../../services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";
import { error } from "@/services/logger";

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

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return res.status(401).json({});
    }

    if (
        !checkPermission(user!.permissions, [constants.permissions.manageMedia])
    ) {
        return res.status(403).json({ message: responses.action_not_allowed });
    }

    try {
        let response = await medialitService.getPresignedUrlForUpload(
            domain.name,
        );
        return res.status(200).json({ url: response });
    } catch (err: any) {
        error(err.mssage, {
            stack: err.stack,
        });
        return res.status(500).json({ error: err.message });
    }
}
