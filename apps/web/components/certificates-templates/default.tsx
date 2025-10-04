import React from "react";
import Image from "next/image";
import { formattedLocaleDate } from "@ui-lib/utils";
import { CertificateData } from "./certificate-data";

export default function DefaultCertificateTemplate({
    data: certificate,
}: {
    data: CertificateData;
}) {
    return (
        <>
            <style jsx>{`
                .certificate-template {
                    box-sizing: border-box;
                    position: relative;
                }

                @media print {
                    * {
                        box-sizing: border-box !important;
                    }

                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }

                    .certificate-container {
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }

                    .certificate-template {
                        margin: 0 !important;
                        padding: 0.75in !important;
                        width: 11in !important;
                        height: 8.5in !important;
                        box-shadow: none !important;
                        border: 3px solid #000 !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                    }

                    @page {
                        size: letter landscape;
                        margin: 0;
                    }
                }
            `}</style>

            <div className="certificate-container min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div
                    className="certificate-template bg-white border-3 border-gray-800 shadow-lg relative"
                    style={{
                        width: "11in",
                        height: "8.5in",
                        boxSizing: "border-box",
                        padding: "0.75in",
                    }}
                >
                    {/* Modern Decorative Border */}
                    <div className="absolute inset-2 border-2 border-gray-300 rounded-lg"></div>
                    <div className="absolute inset-4 border border-gray-200 rounded-lg"></div>

                    {/* Header */}
                    <div className="text-center mb-8 relative z-10">
                        {certificate.logo && (
                            <div className="mb-4">
                                <Image
                                    src={certificate.logo.file}
                                    alt="Certificate Logo"
                                    width={80}
                                    height={80}
                                    className="mx-auto"
                                />
                            </div>
                        )}

                        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-wide">
                            {certificate.title}
                        </h1>

                        <div className="w-32 h-0.5 bg-gray-500 mx-auto mb-6"></div>
                    </div>

                    {/* Main Content */}
                    <div className="text-center mb-12 relative z-10">
                        {certificate.subtitle && (
                            <p className="text-lg text-gray-700 mb-4 font-medium">
                                {certificate.subtitle}
                            </p>
                        )}

                        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-wide">
                            {certificate.userName}
                        </h2>

                        {certificate.description && (
                            <p className="text-base text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed">
                                {certificate.description}
                            </p>
                        )}

                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {certificate.productTitle}
                        </h3>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end mt-auto relative z-10">
                        {/* Signature */}
                        <div className="flex-1 text-center">
                            {certificate.signatureImage && (
                                <div className="mb-3">
                                    <Image
                                        src={certificate.signatureImage.file}
                                        alt="Signature"
                                        width={100}
                                        height={50}
                                        className="mx-auto"
                                    />
                                </div>
                            )}

                            <div className="border-t-2 border-gray-500 w-32 mx-auto mb-2"></div>
                            <p className="text-sm font-semibold text-gray-700">
                                {certificate.signatureName}
                            </p>
                            {certificate.signatureDesignation && (
                                <p className="text-xs text-gray-600">
                                    {certificate.signatureDesignation}
                                </p>
                            )}
                        </div>

                        {/* Date */}
                        <div className="flex-1 text-center">
                            <div className="border-t-2 border-gray-500 w-32 mx-auto mb-2"></div>
                            <p className="text-sm font-semibold text-gray-700">
                                Date of Completion
                            </p>
                            <p className="text-xs text-gray-600">
                                {formattedLocaleDate(+certificate.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Certificate ID */}
                    <div className="text-center mt-6 pt-3 border-t border-gray-300 relative z-10">
                        <p className="text-xs text-gray-500">
                            Certificate ID: {certificate.certificateId}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
