"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@components/ui/skeleton";
import DefaultCertificate from "@/templates/certificates/default";
import { useCertificate } from "@/hooks/use-certificate";

const templateMap = {
    default: DefaultCertificate,
};

export default function CertificatePage() {
    const params = useParams();
    const router = useRouter();
    const certId = params.certId;
    const searchParams = useSearchParams();
    const courseId = searchParams.get("courseId");
    const { certificate, loaded } = useCertificate(
        certId as string,
        courseId as string,
    );

    if (loaded && !certificate) {
        router.replace("/");
    }

    if (!certificate) {
        return <Skeleton className="w-full h-full" />;
    }

    const Template = templateMap[certificate.templateId] || DefaultCertificate;

    return <Template certificate={certificate} />;
}
