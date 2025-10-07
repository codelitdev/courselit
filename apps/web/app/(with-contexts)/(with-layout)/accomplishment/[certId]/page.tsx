"use client";

import {
    Badge,
    Button,
    Header1,
    Header2,
    Section,
    Text1,
} from "@courselit/page-primitives";
import { redirect, useParams } from "next/navigation";
import { ThemeContext } from "@components/contexts";
import { useContext, useRef, useState } from "react";
import { BadgeCheck, ExternalLinkIcon, Printer } from "lucide-react";
import Link from "next/link";
import { Image } from "@courselit/components-library";
import { formattedLocaleDate } from "@ui-lib/utils";
import { useCertificate } from "@/hooks/use-certificate";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccomplishmentPage() {
    const params = useParams();
    const certId = params.certId;
    const { theme } = useContext(ThemeContext);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const { certificate, loaded } = useCertificate(certId as string);

    const handlePrint = () => {
        const iframeElement = iframeRef.current;
        if (!iframeElement) return;
        const iframeWindow = iframeElement.contentWindow;
        if (!iframeWindow) return;
        iframeWindow.focus();
        iframeWindow.print();
    };

    if (loaded && !certificate) {
        redirect("/");
    }

    if (!certificate) {
        return (
            <Section theme={theme.theme}>
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <Skeleton className="h-7 sm:h-9 w-48 sm:w-80" />
                        <Skeleton className="h-6 w-20" />
                    </div>

                    {/* User completion info skeleton */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-full mx-auto sm:mx-0" />
                        <div className="flex flex-col gap-2 text-center sm:text-left w-full">
                            <Skeleton className="h-5 w-64 sm:w-80 mx-auto sm:mx-0" />
                            <Skeleton className="h-4 w-40 mx-auto sm:mx-0" />
                        </div>
                    </div>

                    {/* Certificate section header + viewer skeleton */}
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="w-full lg:h-[900px] h-[300px] md:h-[600px] rounded-lg" />
                    </div>
                </div>
            </Section>
        );
    }

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <Header1 theme={theme.theme}>
                        {certificate.productTitle}
                    </Header1>
                    <div>
                        <Link href={`/p/${certificate.productPageId}`}>
                            <Badge
                                theme={theme.theme}
                                className="flex items-center gap-1"
                            >
                                Visit <ExternalLinkIcon className="h-4 w-4" />
                            </Badge>
                        </Link>
                    </div>
                </div>

                {/* User completion info - responsive layout */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {certificate.userImage && (
                        <div className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-full overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                            <Image
                                src={certificate.userImage.file}
                                alt={certificate.userName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <Text1
                            theme={theme.theme}
                            className="flex items-center gap-2"
                        >
                            <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                            Completed by{" "}
                            <span className="font-bold">
                                {certificate.userName}
                            </span>
                        </Text1>
                        <Text1 theme={theme.theme} className="text-gray-500">
                            {formattedLocaleDate(+certificate.createdAt)}
                        </Text1>
                    </div>
                </div>

                {/* Certificate section header - responsive */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Header2 theme={theme.theme}>Certificate</Header2>
                        <Button
                            theme={theme.theme}
                            onClick={handlePrint}
                            disabled={!isIframeLoaded}
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                    </div>

                    <div className="relative w-full">
                        {!isIframeLoaded && (
                            <Skeleton className="w-full lg:h-[900px] h-[300px] md:h-[600px] rounded-lg" />
                        )}
                        <div
                            className={`transition-opacity duration-300 ${isIframeLoaded ? "opacity-100" : "opacity-0"}`}
                            style={{ overflow: "auto" }}
                        >
                            <div style={{ width: 1100, margin: "0 auto" }}>
                                <iframe
                                    src={`/certificate/${certId}`}
                                    style={{
                                        width: 1100,
                                        height: 850,
                                        border: 0,
                                        display: "block",
                                        background: "white",
                                    }}
                                    ref={iframeRef}
                                    onLoad={() => setIsIframeLoaded(true)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
