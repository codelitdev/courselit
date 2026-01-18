import { Repository } from "../core/repository";
import { CommunityReport } from "@courselit/common-models";

export interface CommunityReportRepository extends Repository<CommunityReport> {
    findByReportId(
        reportId: string,
        domainId: string,
    ): Promise<CommunityReport | null>;
    findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<CommunityReport[]>;
}
