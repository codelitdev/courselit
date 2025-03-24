import { InternalUser } from "@courselit/common-logic";
import { Domain } from "./Domain";

export default interface GQLContext {
    user: InternalUser;
    subdomain: Domain;
    address: string;
}
