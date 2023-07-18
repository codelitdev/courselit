import { Domain } from "./Domain";
import { User } from "./User";

export default interface GQLContext {
    user: User;
    subdomain: Domain;
    address: string;
}
