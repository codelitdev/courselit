import { LessonType } from "./constants";

export type LessonType = (typeof LessonType)[keyof typeof LessonType];
