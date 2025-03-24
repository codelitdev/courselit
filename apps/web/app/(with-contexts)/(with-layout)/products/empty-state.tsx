import { BookOpen } from "lucide-react";

export function EmptyState({ publicView = true }: { publicView?: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-muted-foreground">
                {publicView ? "The team has " : "You have "} not added any
                products yet.
            </p>
        </div>
    );
}
