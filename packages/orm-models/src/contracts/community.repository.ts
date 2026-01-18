import { Repository } from "../core/repository";
import { Community } from "@courselit/common-models";

export interface CommunityRepository extends Repository<Community> {
    findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<Community | null>;
    findByPageId(pageId: string, domainId: string): Promise<Community | null>;
}
