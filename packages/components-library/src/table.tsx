import { ReactNode } from "react";
import IconButton from "./icon-button";
import { ArrowLeft, ArrowRight } from "@courselit/icons";

interface TableProps {
    children: ReactNode;
    className?: string;
}

interface TableHeadProps {
    children: ReactNode;
    className?: string;
}

interface TableBodyProps {
    children: ReactNode;
    className?: string;
    page?: number;
    onPageChange?: (...args: any[]) => void;
    loading?: boolean;
    endReached?: boolean;
}

interface TableRowProps {
    children: ReactNode;
    className?: string;
}

export function TableHead({
    children,
    className = ""
}: TableHeadProps) {
    return (
        <thead className={`border-0 border-b border-slate-200 ${className}`}>
            <tr className="font-medium">
                {children}
            </tr>
        </thead>
    )
}

export function TableBody({
    children,
    className = "",
    page = 1,
    onPageChange,
    loading = false,
    endReached = false
}: TableBodyProps) {
    return (
        <tbody className={`${className}`}>
            {children}
            <tr className="flex gap-2 mt-4">
                <IconButton
                    variant="soft"
                    disabled={loading || (page === 1)}
                    onClick={() => onPageChange(page - 1)}
                    >
                    <ArrowLeft />
                </IconButton>
                <IconButton
                    variant="soft"
                    disabled={loading || endReached}
                    onClick={() => onPageChange(page + 1)}
                    >
                    <ArrowRight />
                </IconButton>
            </tr>
        </tbody>
    )
}

export function TableRow({
    children,
    className = ""
}: TableRowProps) {
    return (
        <tr className={`border-b border-slate-200 ${className}`}>
            {children}
        </tr>
    )
}

export default function Table({
    children, 
    className = "",
}: TableProps) {
    return <table 
        className={`${className}`}>
        {children}
    </table>
}
