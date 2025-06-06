import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { ThemeContext } from "@components/contexts";
import { Caption, Text2 } from "@courselit/page-primitives";
import { useContext } from "react";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationControlsProps) {
    const { theme: uiTheme } = useContext(ThemeContext);
    const { theme } = uiTheme;

    return (
        <Pagination>
            <PaginationContent className="flex items-center space-x-6">
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) onPageChange(currentPage - 1);
                        }}
                        aria-disabled={currentPage === 1 || totalPages === 0}
                        className={
                            currentPage === 1 || totalPages === 0
                                ? "pointer-events-none opacity-50"
                                : ""
                        }
                    >
                        <Caption theme={theme}>Previous</Caption>
                    </PaginationPrevious>
                </PaginationItem>

                <div>
                    <Text2 theme={theme}>
                        {currentPage} of {totalPages}
                    </Text2>
                </div>

                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                                onPageChange(currentPage + 1);
                        }}
                        aria-disabled={
                            currentPage === totalPages || totalPages === 0
                        }
                        className={
                            currentPage === totalPages || totalPages === 0
                                ? "pointer-events-none opacity-50"
                                : ""
                        }
                    >
                        <Caption theme={theme}>Next</Caption>
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
