import DomainModel, { Domain } from "@models/Domain";
import { NextRequest } from "next/server";
import { getCertificateInternal } from "@/graphql/users/logic";
import puppeteer from "puppeteer";
import pug from "pug";
import path from "path";
import { formattedLocaleDate } from "@ui-lib/utils";
import { error } from "@/services/logger";

async function createTemplate(certificateData: any): Promise<string> {
    const templatePath = path.join(
        process.cwd(),
        "templates",
        "certificates",
        "default.pug",
    );

    if (!certificateData) {
        throw new Error("Certificate data is undefined");
    }

    const formattedDate = formattedLocaleDate(
        certificateData.createdAt,
        "long",
    );

    const templateData = {
        certificate: certificateData,
        createdAt: formattedDate,
    };

    return pug.renderFile(templatePath, templateData);
}

async function generatePdf(html: string): Promise<Buffer> {
    const executablePath =
        process.env.NODE_ENV === "production"
            ? await puppeteer.executablePath("chrome")
            : undefined;

    const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "letter",
            landscape: true,
            printBackground: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0",
            },
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}

async function updateCertificateDownloadTime(certId: string, domainId: any) {
    const CertificateModel = (await import("@models/Certificate")).default;

    await CertificateModel.updateOne(
        { certificateId: certId, domain: domainId },
        { lastDownloadedAt: new Date() },
    );
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ certId: string }> },
) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return { error: { message: "Domain not found", status: 404 } };
    }

    const certId = (await params).certId;
    if (!certId) {
        return Response.json({ message: "Missing certId" }, { status: 400 });
    }

    try {
        const certificateData = await getCertificateInternal(
            certId,
            (domain as any)._id,
        );

        if (!certificateData) {
            return Response.json(
                { error: "Certificate not found" },
                { status: 404 },
            );
        }

        const template = await createTemplate(certificateData);

        const pdfBuffer = await generatePdf(template);

        await updateCertificateDownloadTime(certId, (domain as any)._id);

        return new Response(pdfBuffer as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="certificate-${certId}.pdf"`,
            },
        });
    } catch (err: any) {
        error(err.message, {
            route: `/api/certificate/${certId}`,
            stack: err.stack,
        });
        return Response.json(
            {
                error: "Failed to generate certificate PDF",
                details: err.message,
            },
            { status: 500 },
        );
    }
}
