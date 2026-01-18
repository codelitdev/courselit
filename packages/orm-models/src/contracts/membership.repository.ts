import { Repository } from "../core/repository";
import { Membership, MembershipEntityType } from "@courselit/common-models";

export interface MembershipRepository extends Repository<Membership> {
    findByUserAndEntity(
        userId: string,
        entityId: string,
        entityType: MembershipEntityType,
        domainId: string,
    ): Promise<Membership | null>;
    findByUser(userId: string, domainId: string): Promise<Membership[]>;
    findByEntity(
        entityId: string,
        entityType: MembershipEntityType,
        domainId: string,
    ): Promise<Membership[]>;
}
