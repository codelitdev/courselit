import type { NextApiRequest, NextApiResponse } from "next";
import schema from "../../graphql";
import verifyDomain from '../../middlewares/verify-domain';
import nc from 'next-connect';
import passport from 'passport';

import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
  } from 'graphql';
import User from "../../models/User";
import connectToDatabase from "../../services/db";
import jwtStrategy from '../../lib/jwt';
import ApiRequest from "../../models/ApiRequest";

passport.use(jwtStrategy);

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
        passport.authenticate('jwt', { session: false }),
        (req: ApiRequest, res: NextApiResponse) => {
            console.log(req.user, req.subdomain);
            res.status(200).json({ message: 'success' });
        }
    )

export async function handler(
    req: NextApiRequest, 
    res: NextApiResponse
) {
    await verifyDomain(req, res);
    const subdomain = JSON.parse(<string>res.getHeader('subdomain'));

    if (req.method !== 'POST') {
        res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findOne({ email: session!.user?.email });
    const source = `{ getUser(email: "${req.body.email}") { email, id } }`;
    const contextValue = { user, subdomain };
    const response = await graphql({ schema, source, rootValue: null, contextValue });
    console.log(response)
    return res.status(200).json(response);
}