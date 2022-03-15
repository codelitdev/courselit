import type { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import passport from 'passport';
import { responses } from '../../../config/strings';
import jwtStrategy from '../../../lib/jwt';
import verifyDomain from '../../../middlewares/verify-domain';
import connectToDatabase from '../../../services/db';

passport.use(jwtStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
      res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
      res.status(404).end("Not found")
    },
})
    .use(passport.initialize())
    .use(async (req: NextApiRequest, res: NextApiResponse, next) => {
        await connectToDatabase();
        await verifyDomain(req, res)
        next()
    })
    .post(
        passport.authenticate('jwt', { session: false }),
        (req: NextApiRequest, res: NextApiResponse) => {
            return res.status(200).json({ message: responses.success }); 
        }
    )