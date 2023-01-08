export interface Question {
    text: string;
    options: Option[];
}

interface Option {
    text: string;
    correctAnswer: boolean;
}
