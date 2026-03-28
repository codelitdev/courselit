export interface ScormData {
    lessons?: Record<string, { cmi: Record<string, unknown> }>;
}

export interface Progress {
    courseId: string;
    completedLessons: string[];
    downloaded?: boolean;
    accessibleGroups: string[];
    lastDripAt?: Date;
    certificateId?: string;
    scormData?: ScormData;
    createdAt?: Date;
    updatedAt?: Date;
}
