import { Question } from "./question";

export interface Quiz {
    questions: Question[];
    requiresPassingGrade: boolean;
    passingGrade: number;
}
