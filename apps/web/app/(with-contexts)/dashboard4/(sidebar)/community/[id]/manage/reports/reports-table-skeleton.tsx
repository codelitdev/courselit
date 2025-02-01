import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function ReportsTableSkeleton() {
    return (
        <div className="rounded-md bg-white">
            <div className="p-4 border-b">
                <Skeleton className="h-10 w-[180px]" />
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50/50">
                        <TableHead className="text-sm font-medium text-gray-500">
                            Content
                        </TableHead>
                        <TableHead className="text-sm font-medium text-gray-500">
                            Type
                        </TableHead>
                        <TableHead className="text-sm font-medium text-gray-500">
                            Reason
                        </TableHead>
                        <TableHead className="text-sm font-medium text-gray-500">
                            Status
                        </TableHead>
                        <TableHead className="text-sm font-medium text-gray-500">
                            Rejection Reason
                        </TableHead>
                        <TableHead className="text-sm font-medium text-gray-500">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-b">
                            <TableCell>
                                <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-6 w-16" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-8 w-20" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    );
}
