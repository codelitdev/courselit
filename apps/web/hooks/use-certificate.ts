import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export function useCertificate(certId: string, courseId?: string) {
    const [certificate, setCertificate] = useState<any>(null);
    const [loaded, setLoaded] = useState(false);
    const fetch = useGraphQLFetch();

    useEffect(() => {
        async function getCertificate() {
            const query = `
                query GetCertificate($certificateId: String!, $courseId: String) {
                    certificate: getCertificate(certificateId: $certificateId, courseId: $courseId) {
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
                        courseId,
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
            } finally {
                setLoaded(true);
            }
        }

        if (certId && !loaded) {
            getCertificate();
        }
    }, [certId]);

    return { certificate, loaded };
}
