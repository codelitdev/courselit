import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import passport from "passport";
import { responses } from "../../../config/strings";
import jwtStrategy from "../../../lib/jwt";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import verifyJwt from "../../../middlewares/verify-jwt";
import ApiRequest from "../../../models/ApiRequest";
import { error } from "../../../services/logger";
import * as medialitService from "../../../services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";

passport.use(jwtStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        error(err.message, {
            fileName: `/api/media/[mediaId].ts`,
            stack: err.stack,
        });
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
})
    .use(passport.initialize())
    .use(connectDb)
    .use(verifyDomain)
    .use(verifyJwt(passport))
    .get(getMediaDetailsHandler)
    .delete(deleteMediaHandler);

async function getMediaDetailsHandler(
    req: ApiRequest & { params: Record<string, any> },
    res: NextApiResponse
) {
    if (
        !checkPermission(req.user!.permissions, [
            constants.permissions.manageAnyCourse,
            constants.permissions.manageCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const { mediaId } = req.query;

    try {
        let response = await medialitService.getMedia(<string>mediaId);
        return res.status(200).json(response);
    } catch (err: any) {
        return res.status(500).json({ error: responses.internal_error });
    }
}

async function deleteMediaHandler(
    req: ApiRequest & { params: Record<string, any> },
    res: NextApiResponse
) {
    if (
        !checkPermission(req.user!.permissions, [
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
