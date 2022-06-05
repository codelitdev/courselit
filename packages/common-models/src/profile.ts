export default interface Profile {
    name: string;
    id: string;
    fetched: boolean;
    purchases: unknown[];
    email: string;
    bio: string;
    permissions: string[];
    userId: string;
}
