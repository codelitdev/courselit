import { Media } from "./media";

export interface InstructorLink {
    label: string;
    url: string;
}

export interface Instructor {
    instructorId: string;
    name: string;
    bio?: string;
    avatar?: Media;
    links: InstructorLink[];
    // Only exposed to people who can manage courses.
    userId?: string | null;
}
