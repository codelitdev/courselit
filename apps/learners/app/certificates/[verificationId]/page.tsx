"use client";

import { Button } from "@codelitdev/design-system";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
          <p className="eyebrow">CourseLit</p>
          <p className="text-sm text-muted-foreground">Certificate verification</p>
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
        {state === "loading" ? <p>Checking certificate…</p> : null}
        {state === "missing" ? (
          <p role="alert">That certificate could not be verified.</p>
        ) : null}
        {state === "found" && certificate ? (
          <>
            {certificate.logoUrl ? (
              <img className="certificate-logo" src={certificate.logoUrl} alt="School logo" />
            ) : null}
            <p className="certificate-kicker">Verified certificate</p>
            <h1 className="certificate-title">{certificate.title}</h1>
            <div className="certificate-rule" />
            <p className="certificate-subtitle">{certificate.subtitle}</p>
            <h2 className="certificate-recipient">{certificate.learnerName}</h2>
            <p className="certificate-description">{certificate.description}</p>
            <h3 className="certificate-product">{certificate.productTitle}</h3>
            <div className="certificate-footer">
              <div>
                {certificate.signatureImageUrl ? (
                  <img
                    className="certificate-signature-image"
                    src={certificate.signatureImageUrl}
                    alt="Signature"
                  />
                ) : null}
                <div className="certificate-line" />
                <p>{certificate.signatureName}</p>
                {certificate.signatureDesignation ? (
                  <p className="certificate-meta">{certificate.signatureDesignation}</p>
                ) : null}
              </div>
              <div>
                <div className="certificate-line" />
                <p>Date of Completion</p>
                <p className="certificate-meta">
                  {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}
                </p>
              </div>
            </div>
            <p className="certificate-id">ID: {certificate.id}</p>
          </>
        ) : null}
      </section>
    </main>
  );
}
