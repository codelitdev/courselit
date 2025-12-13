import { Constants } from ".";

export type LoginProvider =
    (typeof Constants.LoginProvider)[keyof typeof Constants.LoginProvider];
