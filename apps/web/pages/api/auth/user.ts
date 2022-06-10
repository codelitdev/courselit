import type { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import passport from "passport";
import { responses } from "../../../config/strings";
import jwtStrategy from "../../../lib/jwt";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";

passport.use(jwtStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
})
    .use(passport.initialize())
    .use(connectDb)
    .use(verifyDomain)
    .post(
        passport.authenticate("jwt", { session: false }),
        (req: NextApiRequest, res: NextApiResponse) => {
            return res.status(200).json({ message: responses.success });
        }
    );
