"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LearnerButton as Button,
  LearnerCardImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerHeader3,
  LearnerText2,
} from "@/components/themed-page-builder";

type Certificate = {
  id: string;
  verificationId: string;
  schoolId: string;
  learnerName: string;
  productTitle: string;
  issuedAt: string;
  title: string;
  subtitle: string;
  description: string;
  signatureName: string;
  signatureDesignation: string | null;
  signatureImageUrl: string | null;
  logoUrl: string | null;
};

export default function CertificateVerificationPage() {
  const params = useParams<{ verificationId: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
    void fetch(`/api/v1/certificates/${encodeURIComponent(params.verificationId)}`, {
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        setState("missing");
        return;
      }
      setCertificate((await response.json()) as Certificate);
      setState("found");
    });
  }, [params.verificationId]);

  return (
    <main className="certificate-page">
      <header className="certificate-toolbar">
        <div>
          <LearnerText2 className="font-semibold">CourseLit</LearnerText2>
          <LearnerText2 className="text-muted-foreground">
            Certificate verification
          </LearnerText2>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Learner sign in
          </Link>
          {state === "found" ? (
            <Button type="button" onClick={() => window.print()}>
              Print certificate
            </Button>
          ) : null}
        </div>
      </header>
      <section className="certificate-sheet">
        {state === "loading" ? (
          <LearnerText2>Checking certificate…</LearnerText2>
        ) : null}
        {state === "missing" ? (
          <LearnerText2 role="alert">
            That certificate could not be verified.
          </LearnerText2>
        ) : null}
        {state === "found" && certificate ? (
          <>
            {certificate.logoUrl ? (
              <LearnerCardImage
                className="certificate-logo w-auto"
                src={certificate.logoUrl}
                alt="School logo"
              />
            ) : null}
            <LearnerText2 className="certificate-kicker">
              Verified certificate
            </LearnerText2>
            <LearnerHeader1 className="certificate-title">
              {certificate.title}
            </LearnerHeader1>
            <div className="certificate-rule" />
            <LearnerText2 className="certificate-subtitle">
              {certificate.subtitle}
            </LearnerText2>
            <LearnerHeader2 className="certificate-recipient">
              {certificate.learnerName}
            </LearnerHeader2>
            <LearnerText2 className="certificate-description">
              {certificate.description}
            </LearnerText2>
            <LearnerHeader3 className="certificate-product">
              {certificate.productTitle}
            </LearnerHeader3>
            <div className="certificate-footer">
              <div>
                {certificate.signatureImageUrl ? (
                  <LearnerCardImage
                    className="certificate-signature-image w-auto"
                    src={certificate.signatureImageUrl}
                    alt="Signature"
                  />
                ) : null}
                <div className="certificate-line" />
                <LearnerText2>{certificate.signatureName}</LearnerText2>
                {certificate.signatureDesignation ? (
                  <LearnerText2 className="certificate-meta">
                    {certificate.signatureDesignation}
                  </LearnerText2>
                ) : null}
              </div>
              <div>
                <div className="certificate-line" />
                <LearnerText2>Date of Completion</LearnerText2>
                <LearnerText2 className="certificate-meta">
                  {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}
                </LearnerText2>
              </div>
            </div>
            <LearnerText2 className="certificate-id">ID: {certificate.id}</LearnerText2>
          </>
        ) : null}
      </section>
    </main>
  );
}
