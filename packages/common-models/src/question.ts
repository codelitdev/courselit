export interface Question {
    text: string;
    options: Option[];
    type?: "single" | "multiple";
}

interface Option {
    text: string;
    correctAnswer?: boolean;
}
