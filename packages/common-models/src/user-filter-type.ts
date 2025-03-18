import { Constants } from ".";

export type UserFilterType =
    (typeof Constants.UserFilter)[keyof typeof Constants.UserFilter];
