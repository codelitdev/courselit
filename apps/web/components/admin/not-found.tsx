import Link from "next/link";
import { Users } from "lucide-react";

interface NotFoundProps {
    resource: string;
    backLink: string;
    backLinkText: string;
}

export default function NotFound({
    resource,
    backLink,
    backLinkText,
}: NotFoundProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {resource} Not Found
            </h1>
            <p className="text-gray-600 mb-4">
                We couldn&apos;t find the {resource.toLowerCase()} you&apos;re
                looking for. It may have been removed or doesn&apos;t exist.
            </p>
            <Link
                href={backLink}
                className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
                &larr; {backLinkText}
            </Link>
        </div>
    );
}
