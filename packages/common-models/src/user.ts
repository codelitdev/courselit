import { Constants, Media } from ".";
import { Progress } from "./progress";

export default interface User {
    userId: string;
    email: string;
    active: boolean;
    name?: string;
    purchases: Progress[];
    bio?: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    subscribedToUpdates: boolean;
    lead: (typeof Constants.leads)[number];
    tags?: string[];
    avatar: Media;
    invited?: boolean;
}
