import { Repository } from "../core/repository";
import { InternalApiKey } from "../models/apikey";

export interface ApiKeyRepository extends Repository<InternalApiKey> {
    findByName(name: string, domainId: string): Promise<InternalApiKey | null>;
}
