import { Cross as Close } from "@courselit/icons";
import { EDIT_PAGE_HEADER_ALL_PAGES } from "../../../ui-config/strings";
import { IconButton, Link } from "@courselit/components-library";

interface PagesListProps {
    pages: { pageId: string; name: string }[];
    onClose: () => void;
}

function PagesList({ pages, onClose }: PagesListProps) {
    return (
        <ul>
            <li className="flex items-center px-2 py-3 justify-between">
                <h2 className="text-lg font-medium">
                    {EDIT_PAGE_HEADER_ALL_PAGES}
                </h2>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </li>
            {pages.map((page) => (
                <li
                    className="flex items-center px-2 py-3 hover:!bg-slate-100 cursor-pointer justify-between"
                    key={page.pageId}
                >
                    <Link href={`/dashboard/page/${page.pageId}/edit`}>
                        {page.name}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export default PagesList;
