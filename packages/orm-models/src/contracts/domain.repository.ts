import { Repository } from "../core/repository";
import { Domain } from "@courselit/common-models";

export interface DomainRepository extends Repository<Domain> {
    findByHost(host: string): Promise<Domain | null>;
}
