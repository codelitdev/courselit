import { Criteria } from "../core/criteria";
import { Repository } from "../core/repository";
import { User } from "@courselit/common-models";

export interface UserRepository extends Repository<User> {
    findByEmail(email: string, domainId: string): Promise<User | null>;
    findByUserId(userId: string, domainId: string): Promise<User | null>;
    updateTags(userId: string, domainId: string, tags: string[]): Promise<void>;
    deleteByUserId(userId: string, domainId: string): Promise<boolean>;
    countUsers(domainId: string, criteria?: Criteria<User>): Promise<number>;
    upsertUser(
        filter: { email: string; domainId: string },
        data: Partial<User>,
    ): Promise<{ user: User; isNew: boolean }>;
    removeTagFromUsers(tag: string, domainId: string): Promise<void>;
    removePurchaseFromUsers(courseId: string, domainId: string): Promise<void>;
    removeGroupFromPurchases(
        courseId: string,
        groupId: string,
        domainId: string,
    ): Promise<void>;
    getTagsWithDetails(domainId: string, tags: string[]): Promise<any[]>;
    getStudentsForCourse(
        courseId: string,
        domainId: string,
        searchText?: string,
    ): Promise<any[]>;
    findUsers(domainId: string, criteria: Criteria<User>): Promise<User[]>; // Domain-scoped find
}
