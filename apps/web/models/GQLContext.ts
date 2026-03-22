import { InternalUser } from "@courselit/orm-models";
import { Domain } from "./Domain";

export default interface GQLContext {
    user: InternalUser;
    subdomain: Domain;
    address: string;
}
