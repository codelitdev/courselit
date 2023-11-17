export default interface User {
    id: string;
    email: string;
    name: string;
    purchases: string[];
    active: boolean;
    userId: string;
    bio: string;
    permissions: string[];
}
