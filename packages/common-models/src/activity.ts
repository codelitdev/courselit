export interface Activity {
    id: string;
    domain: string;
    userId: string;
    type: string;
    entityId: string;
    message?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
