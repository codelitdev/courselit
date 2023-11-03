import User from "./user";

export default interface UserWithAdminFields extends User {
    subscribedToUpdates: boolean;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
