import { Domain } from "./Domain";
import { NextApiRequest } from "next";
import { User } from "./User";

type ApiRequest = NextApiRequest & {
    user?: User;
    subdomain?: Domain;
};

export default ApiRequest;
