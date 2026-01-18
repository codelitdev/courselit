import { Criteria } from "./criteria";

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface Repository<T> {
    /**
     * Find entity by its unique ID
     */
    findById(id: string): Promise<T | null>;

    /**
     * Find a single entity matching the criteria
     */
    findOne(criteria: Criteria<T>): Promise<T | null>;

    /**
     * Find multiple entities matching the criteria
     */
    findMany(criteria: Criteria<T>): Promise<T[]>;

    /**
     * Find with pagination metadata
     */
    findPaginated(criteria: Criteria<T>): Promise<PaginationResult<T>>;

    /**
     * Create a new entity
     */
    create(entity: Partial<T>): Promise<T>;

    /**
     * Update an existing entity by ID
     */
    update(id: string, entity: Partial<T>): Promise<T | null>;

    /**
     * Delete an entity by ID
     */
    delete(id: string): Promise<boolean>;

    /**
     * Count entities matching criteria
     */
    count(criteria: Criteria<T>): Promise<number>;

    /**
     * Delete multiple entities matching criteria
     */
    deleteMany(criteria: Criteria<T>): Promise<number>;

    /**
     * Execute a transactional unit of work
     * Note: This is an abstraction over DB transactions
     */
    // withTransaction<R>(work: (repo: this) => Promise<R>): Promise<R>;
}
