import type { ReactNode } from "react";

interface EditorLayoutProps {
    editor: ReactNode;
    settings?: ReactNode;
    showSettings?: boolean;
}

export function EditorLayout({
    editor,
    settings,
    showSettings = true,
}: EditorLayoutProps) {
    return (
        <div className="h-full w-full bg-gray-100 flex gap-4 p-4">
            <div className="flex-1 rounded-xl border bg-white shadow-sm overflow-y-auto">
                {editor}
            </div>

            {showSettings && settings && (
                <div className="w-80 rounded-xl border bg-white shadow-sm overflow-y-auto">
                    {settings}
                </div>
            )}
        </div>
    );
}
