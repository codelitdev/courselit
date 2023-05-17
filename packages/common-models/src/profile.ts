interface Progress {
    courseId: string;
    completedLessons: string[];
}

export default interface Profile {
    name: string;
    id: string;
    fetched: boolean;
    purchases: Progress[];
    email: string;
    bio: string;
    permissions: string[];
    userId: string;
    subscribedToUpdates: string;
}
