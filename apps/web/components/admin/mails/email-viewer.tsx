import { useEffect, useState, startTransition } from "react";
import { Email, renderEmailToHtml } from "@courselit/email-editor";
import { Edit } from "lucide-react";
import Link from "next/link";

export default function EmailViewer({
    content,
    emailEditorLink,
}: {
    content: Email | null;
    emailEditorLink?: string;
}) {
    const [renderedHTML, setRenderedHTML] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (content) {
            startTransition(() => {
                setIsLoading(true);
                setError(null);
            });

            renderEmailToHtml({
                email: content,
            })
                .then((html) => {
                    startTransition(() => {
                        setRenderedHTML(html);
                        setIsLoading(false);
                    });
                })
                .catch((err) => {
                    startTransition(() => {
                        setError(err.message || "Failed to render email");
                        setIsLoading(false);
                    });
                });
        } else {
            startTransition(() => {
                setRenderedHTML(null);
                setIsLoading(false);
                setError(null);
            });
        }
    }, [content]);

    if (!content) {
        return null;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    if (!renderedHTML) {
        return <div>No content to display</div>;
    }

    return (
        <div className="relative">
            <iframe
                srcDoc={renderedHTML}
                className="w-full border rounded-lg"
                style={{ minHeight: "480px" }}
                title="Email Preview"
            />
            {emailEditorLink && (
                <Link
                    href={emailEditorLink}
                    className="absolute bottom-8 right-8 bg-accent hover:bg-accent/80 text-accent-foreground rounded-full p-3 shadow-lg transition-colors duration-200 z-10"
                    title="Edit Email"
                >
                    <Edit className="w-5 h-5" />
                </Link>
            )}
        </div>
    );
}
