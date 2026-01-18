import { Model, FilterQuery, SortOrder } from "mongoose";
import * as mongoose from "mongoose";
import { Repository, PaginationResult } from "../../core/repository";
import { Criteria, Operator } from "../../core/criteria";

export abstract class MongooseRepository<T, TDoc> implements Repository<T> {
    constructor(protected model: Model<TDoc>) {}

    /**
     * Must be implemented by concrete repositories to map from Mongoose Document to Domain Entity (POJO)
     */
    protected abstract toEntity(doc: TDoc): T;

    protected castToObjectId(value: any): any {
        if (
            typeof value === "string" &&
            value.length === 24 &&
            /^[0-9a-fA-F]+$/.test(value)
        ) {
            try {
                return new mongoose.Types.ObjectId(value);
            } catch (e) {
                return value;
            }
        }
        return value;
    }

    protected toMongooseQuery(criteria: Criteria<T>): FilterQuery<TDoc> {
        const query: any = {};

        for (const filter of criteria.filters) {
            const field = filter.field as string;
            let value = filter.value;

            if (field === "domain" || field === "_id") {
                value = this.castToObjectId(value);
            }

            switch (filter.operator) {
                case "eq":
                    query[field] = value;
                    break;
                case "neq":
                    query[field] = { $ne: value };
                    break;
                case "gt":
                    query[field] = { $gt: value };
                    break;
                case "gte":
                    query[field] = { $gte: value };
                    break;
                case "lt":
                    query[field] = { $lt: value };
                    break;
                case "lte":
                    query[field] = { $lte: value };
                    break;
                case "in":
                    if (Array.isArray(value)) {
                        query[field] = {
                            $in: value.map((v) => {
                                if (field === "domain" || field === "_id") {
                                    return this.castToObjectId(v);
                                }
                                return v;
                            }),
                        };
                    } else {
                        query[field] = { $in: value };
                    }
                    break;
                case "contains":
                    // Case-insensitive regex search
                    query[field] = { $regex: value, $options: "i" };
                    break;
                case "exists":
                    query[field] = { $exists: value };
                    break;
            }
        }

        return query;
    }

    protected toMongooseSort(criteria: Criteria<T>): Record<string, SortOrder> {
        const sort: Record<string, SortOrder> = {};
        for (const s of criteria.sorts) {
            sort[s.field] = s.direction === "asc" ? 1 : -1;
        }
        return sort;
    }

    async findById(id: string): Promise<T | null> {
        const objectId = this.castToObjectId(id);
        if (typeof objectId === "string" && id.length !== 24) {
            // Not an objectid, so it won't match _id.
            // Return null instead of letting Mongoose throw CastError.
            return null;
        }
        const doc = await this.model.findById(id).lean().exec();
        return doc ? this.toEntity(doc as unknown as TDoc) : null;
    }

    async findOne(criteria: Criteria<T>): Promise<T | null> {
        const query = this.toMongooseQuery(criteria);
        const doc = await this.model.findOne(query).lean().exec();
        return doc ? this.toEntity(doc as unknown as TDoc) : null;
    }

    async findMany(criteria: Criteria<T>): Promise<T[]> {
        const query = this.toMongooseQuery(criteria);
        const sort = this.toMongooseSort(criteria);

        const docs = await this.model
            .find(query)
            .sort(sort)
            .skip(criteria.offset)
            .limit(criteria.limit)
            .lean()
            .exec();

        return docs.map((d) => this.toEntity(d as unknown as TDoc));
    }

    async findPaginated(criteria: Criteria<T>): Promise<PaginationResult<T>> {
        const query = this.toMongooseQuery(criteria);
        const sort = this.toMongooseSort(criteria);

        const [docs, total] = await Promise.all([
            this.model
                .find(query)
                .sort(sort)
                .skip(criteria.offset)
                .limit(criteria.limit)
                .lean()
                .exec(),
            this.model.countDocuments(query),
        ]);

        return {
            data: docs.map((d) => this.toEntity(d as unknown as TDoc)),
            total,
            page: Math.floor(criteria.offset / criteria.limit) + 1,
            limit: criteria.limit,
        };
    }

    async create(entity: Partial<T>): Promise<T> {
        // In Mongoose, create() takes an object and returns the doc
        const created = await this.model.create(entity);
        // If we want a POJO, we should probably call toObject() or lean() equivalent
        // created is a Mongoose Document here.
        return this.toEntity(created.toObject() as unknown as TDoc);
    }

    async update(id: string, entity: Partial<T>): Promise<T | null> {
        const objectId = this.castToObjectId(id);
        if (typeof objectId === "string" && id.length !== 24) {
            return null;
        }
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                { $set: entity as any },
                { new: true, lean: true },
            )
            .exec();

        return updated ? this.toEntity(updated as unknown as TDoc) : null;
    }

    async delete(id: string): Promise<boolean> {
        const objectId = this.castToObjectId(id);
        if (typeof objectId === "string" && id.length !== 24) {
            return false;
        }
        const result = await this.model.findByIdAndDelete(id).exec();
        return !!result;
    }

    async count(criteria: Criteria<T>): Promise<number> {
        const query = this.toMongooseQuery(criteria);
        return this.model.countDocuments(query);
    }

    async deleteMany(criteria: Criteria<T>): Promise<number> {
        const query = this.toMongooseQuery(criteria);
        const result = await this.model.deleteMany(query).exec();
        return result.deletedCount;
    }
}
