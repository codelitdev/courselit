import { Suspense } from "react";
import { ProductsList } from "./products-list";

export default function CoursesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Products</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <ProductsList />
            </Suspense>
        </div>
    );
}
