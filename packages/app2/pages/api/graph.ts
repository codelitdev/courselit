import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import schema from "../../graphql";
import verifyDomain from '../../middlewares/verify-domain';

import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
  } from 'graphql';
import { NextResponse } from "next/server";
import User from "../../models/User";
  
// const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//       name: 'RootQueryType',
//       fields: {
//         hello: {
//           type: GraphQLString,
//           resolve() {
//             return 'world';
//           },
//         },
//       },
//     }),
// });

export default async function handler(
    req: NextApiRequest, 
    res: NextApiResponse
) {
    await verifyDomain(req, res);
    const subdomain = JSON.parse(<string>res.getHeader('subdomain'));

    if (req.method !== 'POST') {
        res.status(403).json({ message: 'Forbidden' });
    }

    const session = await getSession({ req });
    if (!session) {
        res.status(401).json({ message: 'Unauthorized' })
    }

    const user = await User.findOne({ email: session!.user?.email });
    const source = `{ getUser(email: "${req.body.email}") { email, id } }`;
    const contextValue = { user, subdomain };
    const response = await graphql({ schema, source, rootValue: null, contextValue });
    console.log(response)
    return res.status(200).json(response);
}