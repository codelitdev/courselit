"use client";

import {
    Badge,
    Header1,
    Header2,
    Section,
    Text1,
} from "@courselit/page-primitives";
import { redirect, useParams } from "next/navigation";
import { ThemeContext } from "@components/contexts";
import { useContext, useEffect, useState } from "react";
import { BadgeCheck, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { Image } from "@courselit/components-library";
import { formattedLocaleDate } from "@ui-lib/utils";

export default function AccomplishmentPage() {
    const params = useParams();
    const certId = params.certId;
    const { theme } = useContext(ThemeContext);
    const [certificate, setCertificate] = useState<any>(null);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const fetch = useGraphQLFetch();

    useEffect(() => {
        async function getCertificate() {
            const query = `
                query GetCertificate($certificateId: String!) {
                    certificate: getCertificate(certificateId: $certificateId) {
                        certificateId
                        title
                        subtitle
                        description
                        signatureImage {
                            mediaId
                            file
                            thumbnail
                        }
                        signatureName
                        signatureDesignation
                        logo {
                            mediaId
                            file
                            thumbnail
                        }
                        productTitle
                        userName
                        createdAt
                        userImage {
                            mediaId
                            file
                            thumbnail
                        }
                        productPageId
                    }
                }
            `;
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        certificateId: certId,
                    },
                })
                .build();

            try {
                const response = await fetchRequest.exec();
                if (response.certificate) {
                    setCertificate(response.certificate);
                } else {
                    redirect("/");
                }
            } catch (error) {
                redirect("/");
            }
        }

        if (certId) {
            getCertificate();
        }
    }, [certId]);

    if (!certificate) {
        return (
            <Section theme={theme.theme}>
                <div className="flex flex-col gap-8 animate-pulse">
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <div className="h-7 sm:h-9 w-48 sm:w-80 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>

                    {/* User completion info skeleton */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto sm:mx-0" />
                        <div className="flex flex-col gap-2 text-center sm:text-left w-full">
                            <div className="h-5 w-64 sm:w-80 rounded bg-gray-200 dark:bg-gray-700 mx-auto sm:mx-0" />
                            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 mx-auto sm:mx-0" />
                        </div>
                    </div>

                    {/* Certificate section header + viewer skeleton */}
                    <div className="flex flex-col gap-4">
                        <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="w-full lg:h-[900px] h-[300px] md:h-[600px] rounded-lg bg-gray-200 dark:bg-gray-700" />
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
                    <Header2 theme={theme.theme}>Certificate</Header2>

                    <div className="relative w-full">
                        {!isIframeLoaded && (
                            <div className="w-full lg:h-[900px] h-[300px] md:h-[600px] rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        )}
                        <iframe
                            className={`w-full lg:h-[900px] h-[300px] md:h-[600px] transition-opacity duration-300 ${isIframeLoaded ? "opacity-100" : "opacity-0"}`}
                            src={`/accomplishment/${certId}/certificate`}
                            onLoad={() => setIsIframeLoaded(true)}
                        ></iframe>
                    </div>
                </div>
            </div>
        </Section>
    );
}
