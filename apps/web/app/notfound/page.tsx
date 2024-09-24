import { Cross } from "@courselit/icons";
import { PAGE_TITLE_404 } from "@ui-config/strings";

export default function NotFound() {
    return (
        <div className="flex flex-col gap-2 justify-center items-center bg-red-400 h-screen">
            <Cross />
            <h1 className="text-2xl font-semibold">{PAGE_TITLE_404}</h1>
        </div>
    );
}
