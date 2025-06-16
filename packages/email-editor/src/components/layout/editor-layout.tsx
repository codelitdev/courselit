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
        <div className="h-screen bg-gray-100 flex overflow-hidden">
            {/* Left Pane - Editor */}
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-1 rounded-xl border bg-white shadow-sm m-4 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">{editor}</div>
                </div>
            </div>

            {/* Right Pane - Settings */}
            {showSettings && settings && (
                <div className="w-80 flex flex-col overflow-hidden">
                    <div className="flex-1 rounded-xl border bg-white shadow-sm m-4 mr-4 flex flex-col overflow-hidden">
                        {settings}
                    </div>
                </div>
            )}
        </div>
    );
}
