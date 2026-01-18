import { MongooseRepository } from "./base.repository";
import { CommunityCommentRepository } from "../../contracts/community-comment.repository";
import { CommunityComment } from "@courselit/common-models";
import { InternalCommunityComment } from "../../models/community-comment";
import mongoose, { Model } from "mongoose";

export class MongooseCommunityCommentRepository
    extends MongooseRepository<CommunityComment, InternalCommunityComment>
    implements CommunityCommentRepository
{
    constructor(model: Model<InternalCommunityComment>) {
        super(model);
    }

    protected toEntity(doc: InternalCommunityComment): CommunityComment {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as CommunityComment;
    }

    async findByCommentId(
        commentId: string,
        domainId: string,
    ): Promise<CommunityComment | null> {
        const doc = await this.model
            .findOne({ commentId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalCommunityComment) : null;
    }

    async findByPostId(
        postId: string,
        domainId: string,
    ): Promise<CommunityComment[]> {
        const docs = await this.model
            .find({ postId, domain: domainId })
            .sort({ createdAt: 1 })
            .lean();
        return docs.map((doc) =>
            this.toEntity(doc as InternalCommunityComment),
        );
    }
}
