import { ActivityType } from "./constants";

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
