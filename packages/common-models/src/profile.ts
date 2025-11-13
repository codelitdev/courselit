import { Media } from "./media";
import { Progress } from "./progress";

export default interface Profile {
    userId: string;
    name?: string;
    fetched: boolean;
    purchases: Progress[];
    email: string;
    bio?: string;
    permissions: string[];
    subscribedToUpdates: boolean;
    avatar: Partial<Media>;
}
