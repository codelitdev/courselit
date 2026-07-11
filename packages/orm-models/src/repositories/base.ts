import {
    Model,
    type FilterQuery,
    type UpdateQuery,
    type QueryOptions,
} from "mongoose";

export class BaseRepository<T> {
    constructor(protected model: Model<T>) {}

    async findById(id: string): Promise<T | null> {
        return this.model.findById(id).exec();
    }

    async findOne(filter: FilterQuery<T>): Promise<T | null> {
        return this.model.findOne(filter).exec();
    }

    async find(
        filter: FilterQuery<T> = {},
        options?: QueryOptions,
    ): Promise<T[]> {
        return this.model.find(filter, null, options).exec();
    }

    async create(data: Partial<T>): Promise<T> {
        return this.model.create(data);
    }

    async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
        return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<T | null> {
        return this.model.findByIdAndDelete(id).exec();
    }

    async count(filter: FilterQuery<T> = {}): Promise<number> {
        return this.model.countDocuments(filter).exec();
    }
}
