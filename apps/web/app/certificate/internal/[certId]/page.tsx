"use client"

import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { AddressContext, ThemeContext } from "@components/contexts";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import DefaultCertificateTemplate from "@/components/certificates-templates/default";

const templatesMap = {
    default: DefaultCertificateTemplate,
}

export default function CertificatePage() {
    const { theme } = useContext(ThemeContext);
    const address = useContext(AddressContext);
    const [certificate, setCertificate] = useState<any>(null);
    const params = useParams();
    const certId = params?.certId as string;
    const fetch = useGraphQLFetch();
    const Template = templatesMap[certificate?.templateId] || DefaultCertificateTemplate;

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
                }
            } catch (error) {
                console.error(error);
            }
        }

        if (certId) {
            getCertificate();
        }
    }, [certId]);

    if (!certificate) {
        return null;
    }

    return (
        <Template data={certificate} />
    );
}