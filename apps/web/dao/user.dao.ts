import { User } from "@courselit/common-models";
import UserModel from "@models/User";
import { makeModelTextSearchable } from "@/lib/graphql";

export interface IUserDao {
    getUserById(userId: string, domainId: string): Promise<User | null>;
    getUserByEmail(email: string, domainId: string): Promise<User | null>;
    createUser(userData: Partial<User>): Promise<User>;
    updateUser(
        userId: string,
        domainId: string,
        userData: Partial<User>,
    ): Promise<User | null>;
    find(query: any): Promise<User[]>;
    findOne(query: any): Promise<User | null>;
    findOneAndUpdate(
        query: any,
        update: any,
        options: any,
    ): Promise<User | null>;
    countDocuments(query: any): Promise<number>;
    updateMany(query: any, update: any): Promise<any>;
    aggregate(pipeline: any[]): Promise<any[]>;
    deleteUser(userId: string, domainId: string): Promise<any>;
    search(
        {
            offset,
            query,
            graphQLContext,
        }: { offset: number; query: any; graphQLContext: any },
        {
            itemsPerPage,
            sortByColumn,
            sortOrder,
        }: {
            itemsPerPage: number;
            sortByColumn: string;
            sortOrder: number;
        },
    ): Promise<User[]>;
}

export class UserDao implements IUserDao {
    public async getUserById(
        userId: string,
        domainId: string,
    ): Promise<User | null> {
        const user = await UserModel.findOne({
            userId,
            domain: domainId,
        }).lean();
        return user as User;
    }

    public async getUserByEmail(
        email: string,
        domainId: string,
    ): Promise<User | null> {
        const user = await UserModel.findOne({
            email,
            domain: domainId,
        }).lean();
        return user as User;
    }

    public async createUser(userData: Partial<User>): Promise<User> {
        const user = new UserModel(userData);
        const newUser = await user.save();
        return newUser.toObject();
    }

    public async updateUser(
        userId: string,
        domainId: string,
        userData: Partial<User>,
    ): Promise<User | null> {
        const user = await UserModel.findOneAndUpdate(
            { userId, domain: domainId },
            { $set: userData },
            { new: true },
        ).lean();
        return user as User;
    }

    public async find(query: any): Promise<User[]> {
        const users = await UserModel.find(query).lean();
        return users as User[];
    }

    public async findOne(query: any): Promise<User | null> {
        const user = await UserModel.findOne(query).lean();
        return user as User;
    }

    public async findOneAndUpdate(
        query: any,
        update: any,
        options: any,
    ): Promise<User | null> {
        const user = await UserModel.findOneAndUpdate(
            query,
            update,
            options,
        ).lean();
        return user as User;
    }

    public async countDocuments(query: any): Promise<number> {
        return await UserModel.countDocuments(query);
    }

    public async updateMany(query: any, update: any): Promise<any> {
        return await UserModel.updateMany(query, update);
    }

    public async aggregate(pipeline: any[]): Promise<any[]> {
        return await UserModel.aggregate(pipeline);
    }

    public async deleteUser(userId: string, domainId: string): Promise<any> {
        return await UserModel.deleteOne({ userId, domain: domainId });
    }

    public async search(
        {
            offset,
            query,
            graphQLContext,
        }: { offset: number; query: any; graphQLContext: any },
        {
            itemsPerPage,
            sortByColumn,
            sortOrder,
        }: {
            itemsPerPage: number;
            sortByColumn: string;
            sortOrder: number;
        },
    ): Promise<User[]> {
        const searchUsers = makeModelTextSearchable(UserModel);
        const users = await searchUsers(
            {
                offset,
                query,
                graphQLContext,
            },
            {
                itemsPerPage,
                sortByColumn,
                sortOrder,
            },
        );
        return users.map((user: any) => user.toObject());
    }
}
