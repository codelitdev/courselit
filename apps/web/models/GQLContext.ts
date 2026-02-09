import { InternalUser } from "@courselit/common-logic";
import type { Domain } from "@courselit/orm-models/dao/domain";

export default interface GQLContext {
    user: InternalUser;
    subdomain: Domain;
    address: string;
}
