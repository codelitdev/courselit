import { Model } from "mongoose";
import * as mongoose from "mongoose";
import { UserRepository } from "../../contracts/user.repository";
import { MongooseRepository } from "./base.repository";
import { User } from "@courselit/common-models";
import { InternalUser } from "../../models/user";
import { Criteria } from "../../core/criteria";

export class MongooseUserRepository
    extends MongooseRepository<User, InternalUser>
    implements UserRepository
{
    constructor(model: Model<InternalUser>) {
        super(model);
    }

    protected toEntity(doc: InternalUser): User {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain?.toString(),
        } as unknown as User;
    }

    async findByEmail(email: string, domainId: string): Promise<User | null> {
        const doc = await this.model
            .findOne({
                email,
                domain: this.castToObjectId(domainId),
            })
            .lean()
            .exec();

        return doc ? this.toEntity(doc as unknown as InternalUser) : null;
    }

    async findByUserId(userId: string, domainId: string): Promise<User | null> {
        const doc = await this.model
            .findOne({
                userId,
                domain: this.castToObjectId(domainId),
            })
            .lean()
            .exec();

        return doc ? this.toEntity(doc as unknown as InternalUser) : null;
    }

    async updateTags(
        userId: string,
        domainId: string,
        tags: string[],
    ): Promise<void> {
        await this.model
            .updateOne(
                { userId, domain: this.castToObjectId(domainId) },
                { $set: { tags } },
            )
            .exec();
    }

    async deleteByUserId(userId: string, domainId: string): Promise<boolean> {
        const result = await this.model
            .deleteOne({ userId, domain: this.castToObjectId(domainId) })
            .exec();
        return result.deletedCount === 1;
    }

    async countUsers(
        domainId: string,
        criteria?: Criteria<User>,
    ): Promise<number> {
        const query = criteria ? this.toMongooseQuery(criteria) : {};
        query.domain = this.castToObjectId(domainId);
        return this.model.countDocuments(query);
    }

    async upsertUser(
        filter: { email: string; domainId: string },
        data: Partial<User>,
    ): Promise<{ user: User; isNew: boolean }> {
        const result = await this.model
            .findOneAndUpdate(
                {
                    email: filter.email,
                    domain: this.castToObjectId(filter.domainId),
                },
                { $setOnInsert: data },
                // @ts-ignore - mongoose types for includeResultMetadata might be tricky depending on version, generic any for now if needed or cast
                { upsert: true, new: true, includeResultMetadata: true } as any,
            )
            .exec();

        // Mongoose 6/7/8 return structure might vary for includeResultMetadata
        // Assuming result is { value: doc, lastErrorObject: ... }
        // If simply new:true, it returns doc.
        // With includeResultMetadata: true, it returns object.
        const res: any = result;

        return {
            user: this.toEntity(res.value as unknown as InternalUser),
            isNew: !res.lastErrorObject?.updatedExisting,
        };
    }

    async removeTagFromUsers(tag: string, domainId: string): Promise<void> {
        await this.model
            .updateMany(
                { domain: this.castToObjectId(domainId) },
                { $pull: { tags: tag } },
            )
            .exec();
    }

    async removePurchaseFromUsers(
        courseId: string,
        domainId: string,
    ): Promise<void> {
        const domainObjectId = this.castToObjectId(domainId);
        await this.model
            .updateMany(
                { domain: domainObjectId },
                { $pull: { purchases: { courseId: courseId } } as any },
            )
            .exec();
    }

    async removeGroupFromPurchases(
        courseId: string,
        groupId: string,
        domainId: string,
    ): Promise<void> {
        const domainObjectId = this.castToObjectId(domainId);
        await this.model
            .updateMany(
                { domain: domainObjectId },
                {
                    $pull: {
                        "purchases.$[elem].accessibleGroups": groupId,
                    } as any,
                },
                {
                    arrayFilters: [{ "elem.courseId": courseId }],
                },
            )
            .exec();
    }

    async getTagsWithDetails(domainId: string, tags: string[]): Promise<any[]> {
        const domainObjectId = this.castToObjectId(domainId);

        return await this.model.aggregate([
            { $unwind: "$tags" },
            {
                $match: {
                    tags: { $in: tags },
                    domain: domainObjectId,
                },
            },
            {
                $group: {
                    _id: "$tags",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    tag: "$_id",
                    count: 1,
                    _id: 0,
                },
            },
            {
                $unionWith: {
                    coll: "domains",
                    pipeline: [
                        { $match: { _id: domainObjectId } },
                        { $unwind: "$tags" },
                        { $project: { tag: "$tags", _id: 0 } },
                    ],
                },
            },
            {
                $group: {
                    _id: "$tag",
                    count: { $sum: "$count" },
                },
            },
            {
                $project: {
                    tag: "$_id",
                    count: 1,
                    _id: 0,
                },
            },
            { $sort: { count: -1 } },
        ]);
    }

    async getStudentsForCourse(
        courseId: string,
        domainId: string,
        searchText?: string,
    ): Promise<any[]> {
        const domainObjectId = this.castToObjectId(domainId);
        const matchCondition: any = {
            "purchases.courseId": courseId,
            domain: domainObjectId,
        };

        if (searchText) {
            matchCondition.$or = [
                { email: new RegExp(searchText) },
                { name: new RegExp(searchText) },
            ];
        }

        return await this.model.aggregate([
            { $match: matchCondition },
            {
                $addFields: {
                    completedLessons: {
                        $filter: {
                            input: "$purchases",
                            as: "t",
                            cond: {
                                $eq: ["$$t.courseId", courseId],
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$completedLessons",
            },
            {
                $addFields: {
                    progress: "$completedLessons.completedLessons",
                    signedUpOn: "$completedLessons.createdAt",
                    lastAccessedOn: "$completedLessons.updatedAt",
                    downloaded: "$completedLessons.downloaded",
                },
            },
            {
                $project: {
                    userId: 1,
                    email: 1,
                    name: 1,
                    progress: 1,
                    signedUpOn: 1,
                    lastAccessedOn: 1,
                    downloaded: 1,
                    avatar: 1,
                },
            },
        ]);
    }

    async findUsers(
        domainId: string,
        criteria: Criteria<User>,
    ): Promise<User[]> {
        const query = this.toMongooseQuery(criteria);
        query.domain = this.castToObjectId(domainId);
        const docs = await this.model.find(query).lean().exec();
        return docs.map((d) => this.toEntity(d as unknown as InternalUser));
    }
}
