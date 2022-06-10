import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import passport from "passport";
import constants from "../../../config/constants";
import { responses } from "../../../config/strings";
import { checkPermission } from "../../../lib/graphql";
import jwtStrategy from "../../../lib/jwt";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import verifyJwt from "../../../middlewares/verify-jwt";
import ApiRequest from "../../../models/ApiRequest";
import * as medialitService from "../../../services/medialit";

passport.use(jwtStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
    attachParams: true,
})
    .use(passport.initialize())
    .use(connectDb)
    .use(verifyDomain)
    .use(verifyJwt(passport))
    .get(getMediaHandler);

async function getMediaHandler(req: ApiRequest, res: NextApiResponse) {
    if (
        !checkPermission(req.user!.permissions, [
            constants.permissions.viewAnyMedia,
            constants.permissions.manageMedia,
            constants.permissions.manageAnyMedia,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    try {
        let response = await medialitService.getPaginatedMedia({
            group: req.subdomain!.name,
            page: parseInt(<string>req.query.page || "1"),
            limit: constants.mediaRecordsPerPage,
            access: getAccessType(req.query.access),
        });
        return res.status(200).json(response);
    } catch (err: any) {
        console.error(err); // eslint-disable-line no-console
        return res.status(500).json({ error: responses.internal_error });
    }
}

function getAccessType(
    access?: string | string[]
): "public" | "private" | undefined {
    if (!access) {
        return;
    }

    if (Array.isArray(access)) {
        return;
    }

    if (["public"].includes(access)) {
        return "public";
    }

    if (["private"].includes(access)) {
        return "private";
    }
}
