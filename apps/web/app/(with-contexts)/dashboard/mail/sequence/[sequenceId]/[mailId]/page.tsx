"use client";

import { useSearchParams } from "next/navigation";
import { Button2 } from "@courselit/components-library";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function EmailEditorPage({
    params,
}: {
    params: {
        sequenceId: string;
        mailId: string;
    };
}) {
    const searchParams = useSearchParams();
    const redirectTo = searchParams?.get("redirectTo");

    return (
        <EditorLayout
            src={`/dashboard/mail/sequence/${params.sequenceId}/${params.mailId}/internal`}
            redirectTo={redirectTo || "/dashboard/mails?tab=Broadcasts"}
        />
    );
}
const EditorLayout = ({
    src,
    redirectTo,
}: {
    src: string;
    redirectTo: string;
}) => {
    return (
        <div className="flex flex-col h-screen bg-muted/10">
            <div className="fixed w-full border-b z-10 bg-background">
                <header className="flex w-full h-14 px-6 justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-[220px]">
                            <div className="h-10 flex items-center px-3 rounded-md text-sm text-muted-foreground">
                                Email Editor
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={redirectTo}>
                                        <Button2 variant="outline" size="icon">
                                            <LogOut className="h-4 w-4" />
                                        </Button2>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Exit</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </header>
            </div>
            <div className="flex w-full h-[calc(100vh-56px)] mt-14">
                <iframe className="w-full h-full overflow-hidden" src={src} />
            </div>
        </div>
    );
};
