import { ComponentProps } from "react";
import { cn } from "./lib/utils";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "./components/ui/pagination";

interface PaginatedTableProps {
    className?: string;
    totalPages: number;
    page: number;
    onPageChange: (page: number) => void;
    children: React.ReactNode;
}

const PaginatedTableContainer = ({
    className,
    page,
    totalPages,
    onPageChange,
    children,
    ...props
}: ComponentProps<"div"> & PaginatedTableProps) => (
    <div className={cn(className)} {...props}>
        {children}
        {totalPages > 0 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => onPageChange(page - 1)}
                            aria-disabled={page === 1}
                            tabIndex={page === 1 ? -1 : undefined}
                            className={
                                page === 1
                                    ? "pointer-events-none opacity-50"
                                    : undefined
                            }
                        />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink>{page}</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => onPageChange(page + 1)}
                            aria-disabled={page === totalPages}
                            tabIndex={page === totalPages ? -1 : undefined}
                            className={
                                page === totalPages
                                    ? "pointer-events-none opacity-50"
                                    : undefined
                            }
                        />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink className="pointer-events-none">
                            of {totalPages}
                        </PaginationLink>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
    </div>
);

export { PaginatedTableContainer as PaginatedTable };
