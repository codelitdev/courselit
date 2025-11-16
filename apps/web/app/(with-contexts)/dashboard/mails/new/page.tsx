import { promises as fs } from "fs";
import path from "path";
import { EmailTemplate } from "@courselit/common-models";
import NewMailPageClient from "./new-mail-page-client";

async function getSystemTemplates(): Promise<EmailTemplate[]> {
    const templatesDir = path.join(
        process.cwd(),
        "apps/web/templates/system-emails",
    );
    const filenames = await fs.readdir(templatesDir);

    const templates = filenames.map(async (filename) => {
        const filePath = path.join(templatesDir, filename);
        const fileContents = await fs.readFile(filePath, "utf8");
        return JSON.parse(fileContents);
    });

    return Promise.all(templates);
}

export default async function NewMailPage() {
    const systemTemplates = await getSystemTemplates();

    return <NewMailPageClient systemTemplates={systemTemplates} />;
}
