import { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../../config/strings";
import * as medialitService from "../../../services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "DELETE") {
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
    }

    if (!user) {
        return res.status(401).json({});
    }

    if (
        !checkPermission(user!.permissions, [
            constants.permissions.manageAnyCourse,
            constants.permissions.manageCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const { mediaId } = req.query;
    try {
        let response = await medialitService.deleteMedia(<string>mediaId);
        return res.status(200).json({ message: responses.success });
    } catch (err: any) {
        return res.status(500).json({ error: responses.internal_error });
    }
}
