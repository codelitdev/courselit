import { MongooseRepository } from "./base.repository";
import { CommunityReportRepository } from "../../contracts/community-report.repository";
import { CommunityReport } from "@courselit/common-models";
import { InternalCommunityReport } from "../../models/community-report";
import mongoose, { Model } from "mongoose";

export class MongooseCommunityReportRepository
    extends MongooseRepository<CommunityReport, InternalCommunityReport>
    implements CommunityReportRepository
{
    constructor(model: Model<InternalCommunityReport>) {
        super(model);
    }

    protected toEntity(doc: InternalCommunityReport): CommunityReport {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
            // Careful with casting if Omit<...> was used.
            // Internal extends Omit, so we need to ensure 'user' / 'content' are optional or handled if common-models requires them.
            // However, Repository returns the implementation, and logic layer typically populates them.
            // We'll return what we have.
        } as unknown as CommunityReport;
    }

    async findByReportId(
        reportId: string,
        domainId: string,
    ): Promise<CommunityReport | null> {
        const doc = await this.model
            .findOne({ reportId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalCommunityReport) : null;
    }

    async findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<CommunityReport[]> {
        const docs = await this.model
            .find({ communityId, domain: domainId })
            .sort({ createdAt: -1 })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalCommunityReport));
    }
}
