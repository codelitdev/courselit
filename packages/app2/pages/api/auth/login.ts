import passport from 'passport';
import nc from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import magicLinkStrategy from '../../../lib/passport-magic-link';
import verifyDomain from '../../../middlewares/verify-domain';
import connectToDatabase from '../../../services/db';

passport.use(magicLinkStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
      res.status(404).end("Page is not found");
    },
})
    .use(passport.initialize())
    .use(async (req: NextApiRequest, res: NextApiResponse, next) => {
        await connectToDatabase();
        await verifyDomain(req, res)
        next()
    })
    .get(
        passport.authenticate("magiclink", { action: "acceptToken", session: false }),
        (_, res: NextApiResponse) => {
            res.json({ message: "Will set cookies" });
        }
    )
    .post(
        passport.authenticate("magiclink", { action: "requestToken" }),
        (_, res: NextApiResponse) => {
            res.json({ message: "Success" });
        }
    );