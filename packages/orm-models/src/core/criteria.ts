export type Operator =
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "in"
    | "contains"
    | "exists";

export interface Criterion {
    field: string;
    operator: Operator;
    value: any;
}

export interface SortOption {
    field: string;
    direction: "asc" | "desc";
}

export class Criteria<T> {
    filters: Criterion[] = [];
    sorts: SortOption[] = [];
    offset: number = 0;
    limit: number = 20;

    static create<T>(): Criteria<T> {
        return new Criteria<T>();
    }

    where(field: keyof T, operator: Operator, value: any): this {
        this.filters.push({ field: String(field), operator, value });
        return this;
    }

    orderBy(field: keyof T, direction: "asc" | "desc"): this {
        this.sorts.push({ field: String(field), direction });
        return this;
    }

    skip(offset: number): this {
        this.offset = offset;
        return this;
    }

    take(limit: number): this {
        this.limit = limit;
        return this;
    }

    // Helper to merge criteria if needed
    and(other: Criteria<T>): this {
        this.filters.push(...other.filters);
        this.sorts.push(...other.sorts);
        return this;
    }
}
