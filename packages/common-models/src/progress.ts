export interface Progress {
    courseId: string;
    completedLessons: string[];
    downloaded?: boolean;
    accessibleGroups: string[];
    lastDripAt?: Date;
    createdAt?: Date;
}
