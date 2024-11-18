import { Skeleton } from "@courselit/components-library";

export default function LoadingScreen() {
    return (
        <div className="flex flex-col gap-4 p-4">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-80" />
        </div>
    );
}
