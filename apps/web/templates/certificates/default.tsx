import { formattedLocaleDate } from "@ui-lib/utils";

export default function DefaultCertificate({
    certificate,
}: {
    certificate: Record<string, any>;
}) {
    const logoSrc = certificate?.logo?.file as string | undefined;
    const signatureSrc = certificate?.signatureImage?.file as
        | string
        | undefined;
    const createdAt = (certificate?.createdAt as string | undefined) || "Date";

    return (
        <div className="print-root">
            <div className="certificate-container">
                <div className="certificate-border" />

                <div className="header">
                    {logoSrc ? (
                        <div className="logo">
                            <img src={logoSrc} alt="Logo" />
                        </div>
                    ) : null}
                    <h1 className="title">
                        {certificate?.title || "Congratulations"}
                    </h1>
                    <div className="divider" />
                </div>

                <div className="content">
                    {certificate?.subtitle ? (
                        <p className="subtitle">{certificate.subtitle}</p>
                    ) : null}
                    <h2 className="recipient-name">
                        {certificate?.userName || "Student Name"}
                    </h2>
                    {certificate?.description ? (
                        <p className="description">{certificate.description}</p>
                    ) : null}
                    <h3 className="course-title">
                        {certificate?.productTitle || "Certified Course"}
                    </h3>
                </div>

                <div className="footer">
                    <div className="signature-section">
                        {signatureSrc ? (
                            <div className="signature-image">
                                <img src={signatureSrc} alt="Signature" />
                            </div>
                        ) : null}
                        <div className="signature-line" />
                        <p className="signature-name">
                            {certificate?.signatureName || "Instructor"}
                        </p>
                        {certificate?.signatureDesignation ? (
                            <p className="signature-designation">
                                {certificate.signatureDesignation}
                            </p>
                        ) : null}
                    </div>

                    <div className="date-section">
                        <div className="date-line" />
                        <p className="date-label">Date of Completion</p>
                        <p className="date-value">
                            {formattedLocaleDate(+createdAt, "long")}
                        </p>
                    </div>
                </div>

                <div className="certificate-id">
                    <p className="certificate-id-text">
                        ID: {certificate?.certificateId || "N/A"}
                    </p>
                </div>

                <style>{`
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      :root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      body { font-family: Arial, Helvetica, sans-serif; }

      .print-root {
        min-height: 100vh;
        background: #F3F4F6; /* screen preview background */
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      
      .certificate-container {
        width: 11in;
        height: 8.5in;
        margin: 0 auto;
        background: white;
        padding: 0.75in;
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      }
      
      .certificate-border {
        position: absolute;
        top: 0.25in;
        left: 0.25in;
        right: 0.25in;
        bottom: 0.25in;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      
      .header {
        text-align: center;
        margin-bottom: 2rem;
        position: relative;
        z-index: 10;
      }
      
      .logo {
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .logo img {
        max-width: 80px;
        max-height: 80px;
        image-rendering: auto;
      }
      
      .title {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1A202C;
        margin-bottom: 0.5rem;
        letter-spacing: 1px;
      }
      
      .divider {
        width: 8rem;
        height: 2px;
        background: #000;
        margin: 0 auto 1.5rem;
      }
      
      .content {
        text-align: center;
        margin-bottom: 3rem;
        position: relative;
        z-index: 10;
      }
      
      .subtitle {
        font-size: 1.2rem;
        color: #1A202C;
        margin-bottom: 1rem;
        font-weight: normal;
      }
      
      .recipient-name {
        font-size: 2.2rem;
        font-weight: bold;
        color: #1A202C;
        margin-bottom: 1rem;
        letter-spacing: 1px;
      }
      
      .description {
        font-size: 1rem;
        color: #1A202C;
        max-width: 24rem;
        margin: 0 auto 1rem;
        line-height: 1.5;
        font-weight: normal;
      }
      
      .course-title {
        font-size: 1.3rem;
        font-weight: bold;
        color: #1A202C;
        margin-bottom: 0.5rem;
      }
      
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        position: relative;
        z-index: 10;
      }
      
      .signature-section {
        flex: 1;
        text-align: center;
      }
      
      .signature-image {
        margin-bottom: 0.5rem;
        text-align: center; /* center the image within this block */
      }
      
      .signature-image img {
        max-width: 100px;
        max-height: 50px;
        image-rendering: auto;
        display: block; /* ensure centering works regardless of parent text alignment */
        margin: 0 auto; /* horizontally center */
      }
      
      .signature-line {
        width: 8rem;
        height: 2px;
        background: #000;
        margin: 0 auto 0.5rem;
      }
      
      .signature-name {
        font-size: 0.9rem;
        font-weight: normal;
        color: #1A202C;
      }
      
      .signature-designation {
        font-size: 0.8rem;
        color: #1A202C;
        font-weight: normal;
      }
      
      .date-section {
        flex: 1;
        text-align: center;
      }
      
      .date-line {
        width: 8rem;
        height: 2px;
        background: #000;
        margin: 0 auto 0.5rem;
      }
      
      .date-label {
        font-size: 0.9rem;
        font-weight: normal;
        color: #1A202C;
      }
      
      .date-value {
        font-size: 0.8rem;
        color: #1A202C;
        font-weight: normal;
      }
      
      .certificate-id {
        position: absolute;
        bottom: 0.75in;
        left: 0.75in;
        right: 0.75in;
        text-align: center;
        border-top: 1px solid #ccc;
        padding-top: 0.5rem;
        z-index: 10;
      }
      
      .certificate-id-text {
        font-size: 0.7rem;
        color: #888;
        font-weight: normal;
      }
      
      @media screen {
        /* Ensure on-screen preview keeps full page visible */
        .certificate-container { transform: none; }
      }

      @media print {
        html, body { height: auto; }
        body { margin: 0; padding: 0; background: white !important; }
        .print-root { background: transparent; padding: 0; display: block; }
        .certificate-container { margin: 0; box-shadow: none; width: 11in; height: 8.5in; }
        .certificate-border { border-color: #ccc; }
        @page { size: letter landscape; margin: 0; }
      }
            `}</style>
            </div>
        </div>
    );
}
