import { NextApiRequest, NextApiResponse } from "next";
// import nc from "next-connect";
import { responses } from "../../../config/strings";
// import connectDb from "../../../middlewares/connect-db";
// import verifyDomain from "../../../middlewares/verify-domain";
// import ApiRequest from "../../../models/ApiRequest";
// import { error } from "../../../services/logger";
import * as medialitService from "../../../services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
// import setUserFromSession from "../../../middlewares/set-user-from-session";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// export default nc<NextApiRequest, NextApiResponse>({
//     onError: (err, req, res, next) => {
//         error(err.message, {
//             fileName: `/api/media/[mediaId].ts`,
//             stack: err.stack,
//         });
//         res.status(500).json({ error: err.message });
//     },
//     onNoMatch: (req, res) => {
//         res.status(404).end("Not found");
//     },
// })
//     .use(connectDb)
//     .use(verifyDomain)
//     .use(setUserFromSession)
//     .get(getMediaDetailsHandler)
//     .delete(deleteMediaHandler);

// async function getMediaDetailsHandler(
//     req: ApiRequest & { params: Record<string, any> },
//     res: NextApiResponse,
// ) {
//     if (
//         !checkPermission(req.user!.permissions, [
//             constants.permissions.manageAnyCourse,
//             constants.permissions.manageCourse,
//         ])
//     ) {
//         throw new Error(responses.action_not_allowed);
//     }

//     const { mediaId } = req.query;

//     try {
//         let response = await medialitService.getMedia(<string>mediaId);
//         return res.status(200).json(response);
//     } catch (err: any) {
//         return res.status(500).json({ error: responses.internal_error });
//     }
// }

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
