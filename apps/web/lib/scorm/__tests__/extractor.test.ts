import { extractScormPackage } from "../extractor";

// Mock config
jest.mock("@/config/constants", () => ({
    __esModule: true,
    default: {
        scormPackageSizeLimit: 10 * 1024 * 1024,
    },
}));

// Mock adm-zip to strictly test extractor logic without relying on zip binary format
jest.mock("adm-zip", () => {
    return jest.fn().mockImplementation((buffer: Buffer) => {
        let files: Record<string, string> = {};
        try {
            const str = buffer.toString();
            if (str.startsWith("{")) {
                files = JSON.parse(str);
            }
            // If not JSON, it is treated as invalid zip (empty entries)
        } catch (e) {
            // ignore
        }

        return {
            getEntries: () => {
                return Object.entries(files).map(([name, content]) => ({
                    entryName: name,
                    isDirectory: false,
                    getData: () => Buffer.from(content),
                }));
            },
        };
    });
});

describe("SCORM Extractor", () => {
    const createScormPackage = (
        manifestContent: string,
        extraFiles: Record<string, string> = {},
    ) => {
        // Create a "mock zip" which is just a JSON object of filenames to content
        // The mocked AdmZip will parse this.
        const files = { "imsmanifest.xml": manifestContent, ...extraFiles };
        return Buffer.from(JSON.stringify(files));
    };

    describe("extractScormPackage", () => {
        it("should fail if zip buffer is invalid (not our mock format)", async () => {
            const result = await extractScormPackage(
                Buffer.from("invalid zip data"),
            );
            // Mock returns empty entries for invalid data
            expect(result.success).toBe(false);
            expect(result.error).toContain("imsmanifest.xml not found");
        });

        it("should fail if imsmanifest.xml is missing", async () => {
            const buffer = Buffer.from(
                JSON.stringify({ "test.txt": "content" }),
            );

            const result = await extractScormPackage(buffer);
            expect(result.success).toBe(false);
            expect(result.error).toContain("imsmanifest.xml not found");
        });

        it("should extract valid SCORM 1.2 package", async () => {
            const manifest = `<?xml version="1.0"?>
                <manifest identifier="test" version="1.1"
                          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
                          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
                    <organizations default="org1">
                        <organization identifier="org1">
                            <title>SCORM 1.2 Course</title>
                            <item identifier="item1" identifierref="res1">
                                <title>Lesson 1</title>
                            </item>
                        </organization>
                    </organizations>
                    <resources>
                        <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html">
                            <file href="index.html"/>
                        </resource>
                    </resources>
                </manifest>`;

            const buffer = createScormPackage(manifest, {
                "index.html": "<html></html>",
            });
            const result = await extractScormPackage(buffer);

            expect(result.success).toBe(true);
            expect(result.packageInfo).toEqual({
                version: "1.2",
                title: "SCORM 1.2 Course",
                entryPoint: "index.html",
                scos: expect.arrayContaining([
                    expect.objectContaining({
                        identifier: "item1",
                        title: "Lesson 1",
                        launchUrl: "index.html",
                    }),
                ]),
                files: expect.arrayContaining([
                    "imsmanifest.xml",
                    "index.html",
                ]),
            });
        });

        it("should extract valid SCORM 2004 package", async () => {
            const manifest = `<?xml version="1.0"?>
                <manifest identifier="test" version="1.1"
                          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
                          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
                          xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
                          xmlns:imsss="http://www.imsglobal.org/xsd/imsss">
                    <metadata>
                        <schema>ADL SCORM</schema>
                        <schemaversion>2004 3rd Edition</schemaversion>
                    </metadata>
                    <organizations default="org1">
                        <organization identifier="org1">
                            <title>SCORM 2004 Course</title>
                            <item identifier="item1" identifierref="res1">
                                <title>Lesson 1</title>
                            </item>
                        </organization>
                    </organizations>
                    <resources>
                        <resource identifier="res1" type="webcontent" adlcp:scormType="sco" href="index.html">
                            <file href="index.html"/>
                        </resource>
                    </resources>
                </manifest>`;

            const buffer = createScormPackage(manifest, {
                "index.html": "<html></html>",
            });
            const result = await extractScormPackage(buffer);

            expect(result.success).toBe(true);
            expect(result.packageInfo?.version).toBe("2004");
        });

        it("should detect entry point mismatch", async () => {
            const manifest = `<?xml version="1.0"?>
                <manifest identifier="test" version="1.1"
                          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
                          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
                    <organizations default="org1">
                        <organization identifier="org1">
                            <title>Broken Course</title>
                            <item identifier="item1" identifierref="res1">
                                <title>Lesson 1</title>
                            </item>
                        </organization>
                    </organizations>
                    <resources>
                        <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="missing.html">
                            <file href="missing.html"/>
                        </resource>
                    </resources>
                </manifest>`;

            // "missing.html" is not in the zip
            const buffer = createScormPackage(manifest, {
                "other.html": "<html></html>",
            });
            const result = await extractScormPackage(buffer);

            expect(result.success).toBe(false);
            expect(result.error).toContain(
                'Entry point "missing.html" not found',
            );
        });
    });
});
