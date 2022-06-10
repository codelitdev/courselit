import { Course } from "../models/Course";

export interface InitiateProps {
    course: Course;
    metadata: Record<string, unknown>;
    purchaseId: string;
}

export default interface Payment {
    setup: () => void;
    initiate: (obj: InitiateProps) => void;
    verify: (event: any) => boolean;
    getPaymentIdentifier: (event: any) => unknown;
    getName: () => string;
}
