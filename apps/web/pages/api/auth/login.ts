import passport from "passport";
import nc from "next-connect";
import { NextApiRequest, NextApiResponse } from "next";
import jwt, { Secret } from "jsonwebtoken";
import magicLinkStrategy from "../../../lib/passport-magic-link";
import verifyDomain from "../../../middlewares/verify-domain";
import constants from "../../../config/constants";
import ApiRequest from "../../../models/ApiRequest";
import { setLoginSession } from "../../../lib/auth";
import { responses } from "../../../config/strings";
import connectDb from "../../../middlewares/connect-db";
import User from "../../../models/User";

passport.use(magicLinkStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Page is not found");
    },
})
    .use(passport.initialize())
    .use(connectDb)
    .use(verifyDomain)
    .get(
        passport.authenticate("magiclink", {
            action: "acceptToken",
            session: false,
        }),
        async (req: ApiRequest, res: NextApiResponse) => {
            await updateLastActive(req.user!._id.toString());

            const token = jwt.sign(
                { email: req.user!.email, domain: req.subdomain!._id },
                <Secret>constants.jwtSecret,
                { expiresIn: constants.jwtExpire }
            );

            await setLoginSession(res, token);

            res.status(200).json({
                message: responses.success,
            });
        }
    )
    .post(
        passport.authenticate("magiclink", { action: "requestToken" }),
        (_, res: NextApiResponse) => {
            res.json({ message: responses.success });
        }
    );

async function updateLastActive(id: string) {
    await User.updateOne(
        { _id: id },
        {
            $currentDate: {
                updatedAt: true,
            },
        }
    );
}
