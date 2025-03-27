import { Suspense } from "react";
import { BlogsList } from "./blogs-list";
import { PAGE_HEADER_ALL_POSTS } from "@ui-config/strings";

export default function BlogsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{PAGE_HEADER_ALL_POSTS}</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <BlogsList />
            </Suspense>
        </div>
    );
}
