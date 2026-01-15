import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";
import config from "@/config/constants";

export interface SCOInfo {
    identifier: string;
    title: string;
    launchUrl: string;
}

export interface ScormPackageInfo {
    version: "1.2" | "2004";
    title: string;
    entryPoint: string;
    scos: SCOInfo[];
    files: string[];
}

export interface ExtractionResult {
    success: boolean;
    error?: string;
    packageInfo?: ScormPackageInfo;
}

export async function extractScormPackage(
    zipBuffer: Buffer,
): Promise<ExtractionResult> {
    if (zipBuffer.length > config.scormPackageSizeLimit) {
        return {
            success: false,
            error: `Package size exceeds maximum allowed (${config.scormPackageSizeLimit / 1024 / 1024}MB)`,
        };
    }

    try {
        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();

        const manifestEntry = entries.find(
            (e) => e.entryName.toLowerCase() === "imsmanifest.xml",
        );
        if (!manifestEntry) {
            return {
                success: false,
                error: "Invalid SCORM package: imsmanifest.xml not found",
            };
        }

        const manifestContent = manifestEntry.getData().toString("utf8");
        const manifest = await parseStringPromise(manifestContent, {
            explicitArray: false,
            mergeAttrs: true,
        });

        const version = detectScormVersion(manifest);

        const scos = extractSCOs(manifest, version);
        if (scos.length === 0) {
            return {
                success: false,
                error: "Invalid SCORM package: No SCOs found in manifest",
            };
        }

        const files = entries
            .filter((e) => !e.isDirectory)
            .map((e) => e.entryName);

        const entryPoint = scos[0].launchUrl;
        if (!files.some((f) => f.toLowerCase() === entryPoint.toLowerCase())) {
            return {
                success: false,
                error: `Invalid SCORM package: Entry point "${entryPoint}" not found`,
            };
        }

        const title = extractTitle(manifest) || "Untitled SCORM Course";

        return {
            success: true,
            packageInfo: {
                version,
                title,
                entryPoint,
                scos,
                files,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse SCORM package: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

/**
 * Detects SCORM version from manifest using industry-standard namespace detection.
 *
 * SCORM version is determined by checking XML namespace declarations:
 * - SCORM 2004 uses: adlcp_v1p3, adlseq_v1p3, adlnav_v1p3, imsss
 * - SCORM 1.2 uses: adlcp_rootv1p2
 */
function detectScormVersion(manifest: any): "1.2" | "2004" {
    // Get all namespace attributes from the manifest root element
    const attrs = manifest?.manifest || {};

    // Collect all attribute values that could contain namespace URIs
    const namespaceValues: string[] = [];
    for (const [key, value] of Object.entries(attrs)) {
        if (
            typeof value === "string" &&
            (key.startsWith("xmlns") || key.includes(":"))
        ) {
            namespaceValues.push(value);
        }
    }
    const namespaces = namespaceValues.join(" ");

    // Check for SCORM 2004 namespace identifiers
    if (
        namespaces.includes("adlcp_v1p3") ||
        namespaces.includes("adlseq_v1p3") ||
        namespaces.includes("adlnav_v1p3") ||
        namespaces.includes("imsss")
    ) {
        return "2004";
    }

    // Check for SCORM 1.2 namespace identifier
    if (namespaces.includes("adlcp_rootv1p2")) {
        return "1.2";
    }

    // Fallback: inspect schemaLocation attribute
    const schemaLocation = attrs["xsi:schemaLocation"] || "";
    if (schemaLocation.includes("adlcp_v1p3")) {
        return "2004";
    }

    // Fallback: check schemaversion in metadata
    const schemaVersion =
        manifest?.manifest?.metadata?.schemaversion ||
        manifest?.manifest?.metadata?.schemaVersion;
    if (schemaVersion) {
        if (
            typeof schemaVersion === "string" &&
            schemaVersion.includes("2004")
        ) {
            return "2004";
        }
        if (typeof schemaVersion === "string" && schemaVersion === "1.2") {
            return "1.2";
        }
    }

    return "1.2";
}

interface ResourceInfo {
    identifier: string;
    href: string;
    isSco: boolean;
}

/**
 * Determines if a resource is a SCO (vs an Asset) based on adlcp:scormType attribute.
 *
 * - SCORM 1.2: adlcp:scormtype="sco" (case-insensitive)
 * - SCORM 2004: adlcp:scormType="sco" (case-insensitive)
 *
 * If attribute is missing, we assume it's a SCO if it has an href (for broader compatibility).
 */
function isScoResource(resource: any, version: "1.2" | "2004"): boolean {
    // Get scormType from various possible attribute locations
    const scormType = (
        resource["adlcp:scormtype"] ||
        resource["adlcp:scormType"] ||
        resource["scormtype"] ||
        resource["scormType"] ||
        ""
    ).toLowerCase();

    if (scormType === "sco") {
        return true;
    }
    if (scormType === "asset") {
        return false;
    }

    // If no explicit scormType, assume SCO if it has an href (launchable)
    // This provides compatibility with packages that don't specify the attribute
    return !!resource.href;
}

/**
 * Recursively walks items in the organization tree to find all SCO references.
 */
function walkItems(
    item: any,
    scoResources: Map<string, ResourceInfo>,
    scos: SCOInfo[],
): void {
    if (!item) return;

    const identifierref = item.identifierref;
    if (identifierref && scoResources.has(identifierref)) {
        const resource = scoResources.get(identifierref)!;
        const title = item.title;
        scos.push({
            identifier: item.identifier || identifierref,
            title:
                typeof title === "string"
                    ? title
                    : title?._ || item.identifier || identifierref,
            launchUrl: resource.href,
        });
    }

    // Recursively process nested items
    const nestedItems = item.item;
    if (nestedItems) {
        const itemArray = Array.isArray(nestedItems)
            ? nestedItems
            : [nestedItems];
        itemArray.forEach((nestedItem: any) =>
            walkItems(nestedItem, scoResources, scos),
        );
    }
}

/**
 * Extracts SCO information from manifest using industry-standard approach.
 *
 * This implementation:
 * 1. Filters resources by adlcp:scormType to distinguish SCOs from assets
 * 2. Respects the default organization specified in the manifest
 * 3. Recursively walks nested items to find all SCO references
 */
function extractSCOs(manifest: any, version: "1.2" | "2004"): SCOInfo[] {
    const scos: SCOInfo[] = [];

    try {
        // Build map of SCO resources (filtering out assets)
        const resources = manifest?.manifest?.resources?.resource;
        if (!resources) return scos;

        const resourceArray = Array.isArray(resources)
            ? resources
            : [resources];
        const scoResources = new Map<string, ResourceInfo>();

        resourceArray.forEach((r: any) => {
            if (r.identifier && r.href && isScoResource(r, version)) {
                scoResources.set(r.identifier, {
                    identifier: r.identifier,
                    href: r.href,
                    isSco: true,
                });
            }
        });

        if (scoResources.size === 0) return scos;

        // Get organizations
        const organizations = manifest?.manifest?.organizations;
        if (!organizations?.organization) return scos;

        const orgList = Array.isArray(organizations.organization)
            ? organizations.organization
            : [organizations.organization];

        // Respect the default organization attribute
        const defaultOrgId = organizations.default;
        const org = defaultOrgId
            ? orgList.find((o: any) => o.identifier === defaultOrgId) ||
              orgList[0]
            : orgList[0];

        if (!org?.item) return scos;

        // Walk all items recursively
        const items = Array.isArray(org.item) ? org.item : [org.item];
        items.forEach((item: any) => walkItems(item, scoResources, scos));
    } catch (error) {
        console.error("Error extracting SCOs:", error);
    }

    return scos;
}

function extractTitle(manifest: any): string | undefined {
    try {
        const organizations = manifest?.manifest?.organizations?.organization;
        if (!organizations) return undefined;

        const org = Array.isArray(organizations)
            ? organizations[0]
            : organizations;
        return org?.title;
    } catch {
        return undefined;
    }
}

export function extractFiles(zipBuffer: Buffer): Map<string, Buffer> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    const files = new Map<string, Buffer>();

    entries.forEach((entry) => {
        if (!entry.isDirectory) {
            files.set(entry.entryName, entry.getData());
        }
    });

    return files;
}
