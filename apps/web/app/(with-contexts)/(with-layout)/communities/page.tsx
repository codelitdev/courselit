import { Suspense } from "react";
import { CommunitiesList } from "./communities-list";

export default function CommunitiesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Communities</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <CommunitiesList />
            </Suspense>
        </div>
    );
}
