import constants from "@config/constants";
const { activityTypes } = constants;

export type ActivityType = (typeof activityTypes)[number];
