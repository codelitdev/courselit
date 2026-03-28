import { Domain } from "./Domain";
import { NextApiRequest } from "next";
import type { User as UserType } from "@courselit/common-models";

type ApiRequest = NextApiRequest & {
    user?: UserType;
    subdomain?: Domain;
};

export default ApiRequest;
